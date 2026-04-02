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

`bash ./scripts/convert-dwg.sh {input} {output}`

If that binary is not installed, uploads of `DWG` files will return a clear backend error instead of failing silently.

The bundled script prefers `ODAFileConverter` and falls back to `dwg2dxf` if available.

## Docker

The repository now includes a `Dockerfile` that downloads and installs `ODA File Converter` during image build using:

`https://www.opendesign.com/guestfiles/get?filename=ODAFileConverter_QT6_lnxX64_8.3dll_27.1.deb`

Build:

`docker build -t fileviewer .`

Run:

`docker run --rm -p 3000:3000 fileviewer`

## Runtime Notes

- No database is used.
- No application persistence is configured.
- Uploaded files are processed in memory or temporary directories and then discarded.
- The only persistent state you may add is container restart policy or an optional `.env` file for runtime configuration.

## Linux Scripts

These scripts work from the repository root regardless of where the project is mounted on Linux:

- `./deploy.sh`
  Builds the container image and installs `ODA File Converter` into the image.
- `./start.sh`
  Starts the app on port `3000` with `--restart unless-stopped`.
- `./stop.sh`
  Stops and removes the running container.

Supported runtimes:

- `docker`
- `podman`

Optional environment variables:

- `APP_NAME`
- `IMAGE_NAME`
- `CONTAINER_NAME`
- `HOST_PORT`
- `CONTAINER_PORT`
- `ODA_DEB_URL`
- `CONTAINER_RUNTIME`

Examples:

`./deploy.sh`

`HOST_PORT=8080 ./start.sh`

`./stop.sh`
