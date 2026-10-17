import { NextResponse } from 'next/server'

/* `/preview-landing` → `/` (301 permanen).
   Route ini menggantikan page preview yang dipakai selama Milestone A–C.
   Tautan lama di bookmark/review tidak boleh 404, tapi juga tidak boleh
   menampilkan landing duplikat yang di-noindex. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url), 301)
}
