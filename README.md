<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CAD File Viewer

Web viewer for `DXF`, `DWG`, `STL`, `STP/STEP`, and `3MF` files.

View your app in AI Studio: https://ai.studio/apps/997acadb-a28f-4f4e-98af-2eb592bda298

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optionally configure `DWG_CONVERTER_CMD` in `.env.local` if you want backend conversion from `DWG` to `DXF`
3. Run the app:
   `npm run dev`

## Supported Formats

- `DXF`: rendered directly as 2D linework
- `DWG`: converted on the backend to `DXF` before rendering
- `STL`: rendered directly in 3D
- `STP` / `STEP`: parsed with `occt-import-js` and rendered in 3D
- `3MF`: rendered in 3D

## DWG Conversion

The app does not convert `DWG` in pure JavaScript. The backend executes the command configured in `DWG_CONVERTER_CMD`.

Default command:

`dwg2dxf {input} {output}`

If that binary is not installed, uploads of `DWG` files will return a clear backend error instead of failing silently.
