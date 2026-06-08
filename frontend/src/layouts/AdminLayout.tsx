import RoleLayout from "./RoleLayout";

export default function AdminLayout() {
  return (
    <RoleLayout
      title="Admin · DS Chatbot"
      accent="rose"
      homePath="/admin"
      links={[
        { to: "/admin", label: "Tổng quan", end: true },
        { to: "/admin/teachers", label: "Giáo viên" },
        { to: "/admin/students", label: "Sinh viên" },
        { to: "/admin/courses", label: "Môn học" },
        { to: "/admin/classes", label: "Lớp học" },
      ]}
    />
  );
}
