import type {
  CLSMetric,
  FCPMetric,
  FIDMetric,
  INPMetric,
  LCPMetric,
  TTFBMetric,
} from "web-vitals";

type ReportHandler = (
  metric:
    | CLSMetric
    | FCPMetric
    | FIDMetric
    | INPMetric
    | LCPMetric
    | TTFBMetric,
) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onFCP(onPerfEntry);
      onINP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
