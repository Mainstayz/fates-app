use objc2::runtime::NSObjectProtocol;
use objc2::{ rc::Retained, runtime::Bool };
use objc2_foundation::{ NSArray, NSDate, NSError, NSString, NSURL, NSObject };
use objc2_event_kit::{
    EKAlarm,
    EKCalendar,
    EKEntityType,
    EKEvent,
    EKEventStore,
    EKSourceType,
    EKSpan,
    EKCalendarType,
    EKAuthorizationStatus,
};
use dispatch::{ Queue };
use block2::{ Block, RcBlock };

use chrono::{ DateTime, Utc };
use serde::{ Serialize, Deserialize };
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarMatter {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub priority: i32,
    pub type_: i32,
    pub created_at: String,
    pub updated_at: String,
}

// impl From<objc2_event_kit::EKEvent> for CalendarMatter {
// fn from(event: objc2_event_kit::EKEvent) -> Self {
//     let now = Utc::now();
//     let title = unsafe { event.title() };
//     let notes = unsafe { event.notes().map(|s| s.to_string()) };
//     let start_date = unsafe {
//         event
//             .startDate()
//             .map(|d| d.to_rfc3339())
//             .unwrap_or_else(|| now.to_rfc3339())
//     };
//     let end_date = unsafe {
//         event
//             .endDate()
//             .map(|d| d.to_rfc3339())
//             .unwrap_or_else(|| now.to_rfc3339())
//     };

//     CalendarMatter {
//         id: Uuid::new_v4().to_string(),
//         title,
//         description: notes,
//         start_time: start_date,
//         end_time: end_date,
//         priority: 0,
//         type_: 0,
//         created_at: now.to_rfc3339(),
//         updated_at: now.to_rfc3339(),
//     }
// }
// }

#[command]
pub async fn get_calendar_permission_status() -> bool {
    unsafe {
        let status = EKEventStore::authorizationStatusForEntityType(EKEntityType::Event);
        log::info!("Calendar permission status: {:?}", status);
        if
            status == EKAuthorizationStatus::Authorized ||
            status == EKAuthorizationStatus::FullAccess
        {
            true
        } else {
            false
        }
    }
}

#[command]
pub async fn request_calendar_access() -> Result<(), String> {
    unsafe {
        let queue = Queue::main();
        queue.exec_async(move || {
            let store = EKEventStore::new();
            let completion_handler = RcBlock::new(move |granted: Bool, error: *mut NSError| {
                log::info!("Calendar access result: {}", granted.as_bool());
            });
            let completion_handler_ptr = &*completion_handler as *const Block<_> as *mut Block<
                dyn Fn(Bool, *mut NSError)
            >;
            store.requestFullAccessToEventsWithCompletion(completion_handler_ptr);
        });
        Ok(())
    }
}

#[command]
pub async fn get_calendar_events() -> Result<String, String> {
    unsafe {
        //
        // Ok(store.description().unwrap_or_default().to_string())
        let queue = Queue::main();
        queue.exec_async(move || {
            let store = EKEventStore::new();
            let completion_handler = RcBlock::new(move |granted: Bool, error: *mut NSError| {});
            let completion_handler_ptr = &*completion_handler as *const Block<_> as *mut Block<
                dyn Fn(Bool, *mut NSError)
            >;
            store.requestFullAccessToEventsWithCompletion(completion_handler_ptr);
        });
        Ok("".to_string())
    }

    // let store = unsafe { EKEventStore::new() };
    // // Request calendar access
    // let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKCalendarType::Event) };
    // if status != EKAuthorizationStatus::Authorized {
    //     return Err("Calendar access not authorized".to_string());
    // }

    // let now = Utc::now();
    // let one_month_later = now + chrono::Duration::days(30);

    // let events = (
    //     unsafe {
    //         store.events_between(now.naive_utc(), one_month_later.naive_utc(), None)
    //     }
    // ).ok_or_else(|| "Failed to get events".to_string())?;

    // let mut result = Vec::new();
    // for event in events.iter() {
    //     result.push(CalendarMatter::from(event.clone()));
    // }

    // Ok(result)
}
