import { redirect } from "next/navigation";

// Signed-in users are forwarded from /login to their own area by the proxy.
export default function Home() {
  redirect("/login");
}
