import RoleLayout from "./RoleLayout";
import { IBook, IBot, IChart, IGraduate, ISchool, IUsers } from "../components/icons";

export default function AdminLayout() {
  return (
    <RoleLayout
      brandTitle="DS Chatbot"
      brandSubtitle="Quản trị viên"
      accent="rose"
      links={[
        { to: "/admin", label: "Tổng quan", icon: <IChart />, end: true },
        { to: "/admin/teachers", label: "Giáo viên", icon: <IUsers /> },
        { to: "/admin/students", label: "Sinh viên", icon: <IGraduate /> },
        { to: "/admin/courses", label: "Môn học", icon: <IBook /> },
        { to: "/admin/classes", label: "Lớp học", icon: <ISchool /> },
        { to: "/admin/chatbox", label: "Chatbox", icon: <IBot /> },
      ]}
    />
  );
}
