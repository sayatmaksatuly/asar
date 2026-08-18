import { NextResponse, type NextRequest } from "next/server";
export function proxy(request:NextRequest) {
  const headers=new Headers(request.headers);
  const locale=request.nextUrl.pathname.split("/")[1];
  headers.set("x-asar-locale",locale==="kk"?"kk":"ru");
  const response=NextResponse.next({request:{headers}});
  response.headers.set("X-Robots-Tag", request.nextUrl.pathname.match(/^\/(ru|kk)\/(admin|dashboard|auth|onboarding)/) ? "noindex, nofollow" : "index, follow");
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|brand/|illustrations/).*)"]};
