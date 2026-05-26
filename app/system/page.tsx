import { redirect } from "next/navigation";

/** Legacy path — RC1 diagnostics live at /system/health */
export default function SystemPage() {
  redirect("/system/health");
}
