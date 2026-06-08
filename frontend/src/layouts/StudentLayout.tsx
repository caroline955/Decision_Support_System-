import RoleLayout from "./RoleLayout";

export default function StudentLayout() {
  return (
    <RoleLayout
      title="Sinh viên · DS Chatbot"
      accent="brand"
      homePath="/student"
      links={[
        { to: "/student", label: "Trang chủ", end: true },
        { to: "/student/chat", label: "Trợ giảng AI" },
        { to: "/student/schedules", label: "Lịch học" },
        { to: "/student/history", label: "Lịch sử chat" },
      ]}
    />
  );
}
