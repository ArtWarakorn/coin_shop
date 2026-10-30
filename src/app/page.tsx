import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login?error=auth-code-error");
}
