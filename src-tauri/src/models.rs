use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineData {
    pub groups: Vec<TimelineGroup>,
    pub items: Vec<TimelineItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineGroup {
    pub id: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct TimelineItem {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    pub content: String,
    pub start: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub className: Option<String>,
}
