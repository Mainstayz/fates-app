#[cfg(target_os = "macos")]
use block2::{Block, RcBlock};
#[cfg(target_os = "macos")]
use dispatch::Queue;
#[cfg(target_os = "macos")]
use objc2::runtime::Bool;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSWorkspace;
#[cfg(target_os = "macos")]
use objc2_event_kit::{EKCalendarType, EKEntityType, EKEventStore};
#[cfg(target_os = "macos")]
use objc2_foundation::{
    is_main_thread, ns_string, NSCalendar, NSCalendarUnit, NSDate, NSError,
    NSISO8601DateFormatOptions, NSISO8601DateFormatter, NSURL,
};
use std::time::SystemTime;
use std::time::UNIX_EPOCH;
#[cfg(target_os = "windows")]
use windows::{
    core::HSTRING,
    ApplicationModel::Appointments::{
        Appointment, AppointmentManager, AppointmentStore, AppointmentStoreAccessType,
    },
    Foundation::{DateTime, TimeSpan, Uri},
    System::Launcher,
};

use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarMatter {
    pub id: String,
    pub title: String,
    pub description: String,
    pub start_time: String,
    pub end_time: String,
    pub priority: i32,
    pub type_: i32,
    pub sub_type: i32,
}

#[cfg(target_os = "macos")]
impl From<&objc2_event_kit::EKEvent> for CalendarMatter {
    fn from(event: &objc2_event_kit::EKEvent) -> Self {
        unsafe {
            let formatter = NSISO8601DateFormatter::new();
            let options = NSISO8601DateFormatOptions::NSISO8601DateFormatWithInternetDateTime
                | NSISO8601DateFormatOptions::NSISO8601DateFormatWithDashSeparatorInDate
                | NSISO8601DateFormatOptions::NSISO8601DateFormatWithColonSeparatorInTime
                | NSISO8601DateFormatOptions::NSISO8601DateFormatWithColonSeparatorInTimeZone
                | NSISO8601DateFormatOptions::NSISO8601DateFormatWithFractionalSeconds;
            formatter.setFormatOptions(options);

            let id = event.eventIdentifier().unwrap().to_string();
            let title = event.title().to_string();
            let start_date = formatter
                .stringFromDate(event.startDate().as_ref())
                .to_string();
            let end_date = formatter
                .stringFromDate(event.endDate().as_ref())
                .to_string();

            let mut description: String = "".to_string();
            if let Some(notes) = event.notes() {
                description = notes.to_string();
            }

            log::info!(
                "id: {}, title: {}, description: {} start_date: {}, end_date: {}",
                id,
                title,
                description,
                start_date,
                end_date
            );

            CalendarMatter {
                id,
                title,
                description,
                start_time: start_date,
                end_time: end_date,
                priority: 0,
                type_: 3,
                sub_type: 0,
            }
        }
    }
}

#[command]
pub async fn open_calendar_setting() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let nsstr =
            ns_string!("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars");
        let url = NSURL::URLWithString(nsstr).unwrap();
        let workspace = NSWorkspace::sharedWorkspace();
        workspace.openURL(&url);
    }
    #[cfg(target_os = "windows")]
    {
        use windows::{Foundation::Uri, System::Launcher};

        async fn open_calendar_settings_windows() -> Result<(), String> {
            // let uri = Uri::CreateUri(&HSTRING::from("ms-settings:privacy-calendar"))?;
            // Launcher::LaunchUriAsync(&uri)?.await?;
            Ok(())
        }

        open_calendar_settings_windows().await
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Calendar settings are only supported on macOS and Windows");
        Ok(())
    }
}

#[command]
pub async fn get_calendar_permission_status() -> i32 {
    #[cfg(target_os = "macos")]
    unsafe {
        let status = EKEventStore::authorizationStatusForEntityType(EKEntityType::Event);
        log::info!("Calendar permission status: {:?}", status);
        // 0: NotDetermined, 1: Restricted, 2: Denied, 3: FullAccess, 4: WriteOnly
        status.0 as i32
    }
    #[cfg(target_os = "windows")]
    {
        log::info!("Requesting calendar access...");
        let store =
            AppointmentManager::RequestStoreAsync(AppointmentStoreAccessType::AllCalendarsReadOnly)
                .unwrap()
                .await
                .unwrap();
        log::info!("Calendar access result: {:?}", store);
        let calenders = store
            .FindAppointmentCalendarsAsync()
            .unwrap()
            .await
            .unwrap();
        let size = calenders.Size().unwrap();
        if size == 0 {
            log::info!("No calendars found");
        } else {
            log::info!("Found {} calendars", size);
            for calendar in calenders {
                // https://learn.microsoft.com/zh-cn/uwp/api/windows.applicationmodel.appointments.appointmentcalendar?view=winrt-26100
                log::info!("Calendar: {:?}", calendar.DisplayName());
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                let start_time = DateTime {
                    UniversalTime: (now * 10_000_000) + 116444736000000000,
                };

                // 24小时后
                let duration = TimeSpan {
                    Duration: 365 * 24 * 60 * 60 * 10_000_000i64,
                };

                let appointments = match calendar.FindAppointmentsAsync(start_time, duration) {
                    Ok(future) => {
                        match future.await {
                            Ok(appointments) => appointments,
                            Err(e) => {
                                log::error!("Error awaiting appointments: {}", e);
                                return 0;
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Error getting appointments: {}", e);
                        return 0;
                    }
                };
                if appointments.Size().unwrap() == 0 {
                    log::info!("No appointments found");
                    return 0;
                }
                log::info!("Found {} appointments", appointments.Size().unwrap());
                for appointment in appointments {
                    log::info!("Appointment: {:?}", appointment.Subject());
                }
            }
        }
        0 // NotDetermined
    }
}

#[command]
pub async fn request_calendar_access() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let queue = Queue::main();
        queue.exec_async(move || {
            log::info!("is main thread: {}", is_main_thread());
            let store = EKEventStore::new();
            let completion_handler = RcBlock::new(move |granted: Bool, error: *mut NSError| {
                log::info!("Calendar access result: {}", granted.as_bool());
            });
            let completion_handler_ptr =
                &*completion_handler as *const Block<_> as *mut Block<dyn Fn(Bool, *mut NSError)>;
            store.requestFullAccessToEventsWithCompletion(completion_handler_ptr);
        });
    }
    #[cfg(not(target_os = "macos"))]
    {
        log::warn!("Calendar access is only supported on macOS");
    }
    Ok(())
}

#[command]
pub async fn get_calendar_events() -> Result<Vec<CalendarMatter>, String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let store = EKEventStore::new();
        let now = NSDate::date();
        let calendar = NSCalendar::currentCalendar();
        log::info!("Calendar: {:?}", calendar.calendarIdentifier());
        let start_components = calendar.components_fromDate(NSCalendarUnit::Year, &now);
        let start_date = calendar.dateFromComponents(&start_components).unwrap();
        log::info!("Start date: {:?}", start_date);

        log::info!("Start components year: {}", start_components.year());
        start_components.setYear(start_components.year() + 1);
        log::info!("Start components year: {}", start_components.year());

        // start_components.setSecond(start_components.second() - 1);
        let end_date = calendar.dateFromComponents(&start_components).unwrap();
        log::info!("End date: {:?}", end_date);

        let predicate =
            store.predicateForEventsWithStartDate_endDate_calendars(&start_date, &end_date, None);
        let events = store.eventsMatchingPredicate(&predicate);
        log::info!("Events count: {:?}", events.count());
        let mut result = Vec::new();
        for event in events.iter() {
            let calendar = event.calendar().unwrap();
            if calendar.r#type() == EKCalendarType::Subscription
                || calendar.r#type() == EKCalendarType::Birthday
            {
                // 订阅的日历和生日日历不显示
                log::info!(
                    "Skip calendar type: {:?}, title: {:?}, event: {:?}",
                    calendar.r#type(),
                    calendar.title(),
                    event.title()
                );
                continue;
            }
            result.push(CalendarMatter::from(event));
        }
        log::info!("Result count: {:?}", result.len());
        Ok(result)
    }
    #[cfg(not(target_os = "macos"))]
    {
        log::warn!("Calendar events are only supported on macOS");
        Ok(Vec::new())
    }
}
