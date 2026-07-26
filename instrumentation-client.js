import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && posthogHost) {
  posthog.init(projectToken, {
    api_host: posthogHost,
    defaults: "2026-05-30",
    autocapture: true,
    capture_pageview: "history_change",
    disable_session_recording: false,
    session_recording: {
      // Keep interactions visible while masking phone numbers and call text.
      maskAllInputs: true,
      maskTextSelector: ".ph-sensitive",
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) request.name = request.name.split("?")[0];
        return request;
      },
    },
  });
}
