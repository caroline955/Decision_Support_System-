import RoleLayout from "./RoleLayout";
import { IBell, ICalendar, ISchool } from "../components/icons";

export default function TeacherLayout() {
  return (
    <RoleLayout
      brandTitle="DS Chatbot"
      brandSubtitle="Giáo viên"
      accent="emerald"
      links={[
        { to: "/teacher", label: "Lớp của tôi", icon: <ISchool />, end: true },
        { to: "/teacher/schedules", label: "Lịch giảng dạy", icon: <ICalendar /> },
        { to: "/teacher/alerts", label: "Cảnh báo AI", icon: <IBell /> },
      ]}
    />
  );
}
