import RoleLayout from "./RoleLayout";

export default function TeacherLayout() {
  return (
    <RoleLayout
      title="Giáo viên · DS Chatbot"
      accent="emerald"
      homePath="/teacher"
      links={[
        { to: "/teacher", label: "Lớp của tôi", end: true },
        { to: "/teacher/schedules", label: "Lịch học" },
        { to: "/teacher/alerts", label: "Cảnh báo AI" },
      ]}
    />
  );
}
