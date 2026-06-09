import RoleLayout from "./RoleLayout";
import { IBot, ICalendar, IHistory, IHome } from "../components/icons";

export default function StudentLayout() {
  return (
    <RoleLayout
      brandTitle="DS Chatbot"
      brandSubtitle="Sinh viên"
      accent="brand"
      links={[
        { to: "/student", label: "Trang chủ", icon: <IHome />, end: true },
        { to: "/student/chat", label: "Trợ giảng AI", icon: <IBot /> },
        { to: "/student/schedules", label: "Lịch học", icon: <ICalendar /> },
        { to: "/student/history", label: "Lịch sử chat", icon: <IHistory /> },
      ]}
    />
  );
}
