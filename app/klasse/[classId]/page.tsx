import { StudentClassPage } from "../../components/student-class-page";
export default async function ClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  return <StudentClassPage classId={(await params).classId} />;
}
