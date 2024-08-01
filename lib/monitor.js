const https = require("https");

class Monitor {
  constructor(jobKey, baseUrl = "https://cronpulse.live") {
    this.jobKey = jobKey;
    this.baseUrl = baseUrl;
  }

  async ping({ state, message = "" }) {
    let endpoint;
    let queryParams = {};

    switch (state) {
      case "run":
        endpoint = `/api/run/${this.jobKey}`;
        break;
      case "complete":
        endpoint = `/api/complete/${this.jobKey}`;
        break;
      case "failed":
        endpoint = `/api/complete/${this.jobKey}`;
        queryParams.failed = message || true;
        break;
      default:
        throw new Error(`Invalid state: ${state}`);
    }

    return this.sendRequest(endpoint, queryParams);
  }

  async sendRequest(endpoint, queryParams = {}) {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams(queryParams);
      const url = `${this.baseUrl}${endpoint}${
        params.toString() ? "?" + params.toString() : ""
      }`;

      console.log(`📡 Sending request to: ${url}`);

      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
      };

      const req = https.request(options, (res) => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          console.log("📬 Response body:", data);
          resolve(data);
        });
      });

      req.on("error", (error) => {
        console.error("❌ Error:", error);
        reject(error);
      });

      req.end();
    });
  }
}

function wrap(jobKey, jobFunction) {
  const monitor = new Monitor(jobKey);
  const startTime = new Date();

  return async () => {
    try {
      await monitor.ping({ state: "run" });
      await jobFunction();
      await monitor.ping({ state: "complete" });
    } catch (error) {
      console.error("❌ Job failed:", error);
      await monitor.ping({ state: "failed", message: error.message });
    } finally {
      const endTime = new Date();
      console.log(`Job execution time: ${endTime - startTime} ms`);
    }
  };
}

module.exports = {
  Monitor,
  wrap,
};
