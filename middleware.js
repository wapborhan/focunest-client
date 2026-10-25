import { NextResponse } from "next/server";
/** Cheap presence check only. Real verification runs in the layout and every API handler. */
export function middleware(req) {
    if (!req.cookies.get("__session"))
        return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/cash/:path*", "/ibadat/:path*", "/tasks/:path*", "/settings/:path*"] };
