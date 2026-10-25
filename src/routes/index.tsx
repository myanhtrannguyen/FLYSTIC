import { createFileRoute } from "@tanstack/react-router";
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/lexend/700.css";
import { YohaLanding } from "@/components/YohaLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FLYSTIC — Dự án hợp tác sinh viên HUST × JBNU" },
      {
        name: "description",
        content:
          "FLYSTIC là dự án hợp tác giữa sinh viên Đại học Bách khoa Hà Nội và Jeonbuk National University, hỗ trợ thu gom nhựa tại khuôn viên trường.",
      },
      { property: "og:title", content: "FLYSTIC — Dự án hợp tác sinh viên HUST × JBNU" },
      {
        property: "og:description",
        content:
          "Sinh viên HUST và JBNU cùng phát triển FLYSTIC vì những hành động xanh tại trường học.",
      },
    ],
  }),
  component: YohaLanding,
});
