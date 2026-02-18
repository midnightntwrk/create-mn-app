// This file is part of create-mn-app.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { spawn } from "cross-spawn";

export class ProofServerSetup {
  async verify(): Promise<boolean> {
    try {
      // Check if Docker is available
      const dockerAvailable = await this.isDockerAvailable();
      if (!dockerAvailable) {
        return false;
      }

      // Check if proof server image is available
      return await this.isProofServerImageAvailable();
    } catch {
      return false;
    }
  }

  private async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("docker", ["--version"], {
        stdio: "pipe",
      });

      child.on("close", (code) => {
        resolve(code === 0);
      });

      child.on("error", () => {
        resolve(false);
      });
    });
  }

  private async isProofServerImageAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("docker", ["images", "midnightntwrk/proof-server"], {
        stdio: "pipe",
      });

      let output = "";
      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        // Check if image exists in output
        const hasImage = output.includes("midnightntwrk/proof-server");
        resolve(code === 0 && hasImage);
      });

      child.on("error", () => {
        resolve(false);
      });
    });
  }
}
