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

import path from "path";
import fs from "fs-extra";
import Mustache from "mustache";

export class TemplateManager {
  constructor(private templateName: string) {}

  async scaffold(projectPath: string, projectName: string): Promise<void> {
    const templatePath = path.join(
      __dirname,
      "../../templates",
      this.templateName,
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template "${this.templateName}" not found`);
    }

    const templateVars = {
      projectName,
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear(),
      capitalizedName:
        projectName.charAt(0).toUpperCase() + projectName.slice(1),
      kebabName: projectName.toLowerCase().replace(/\s+/g, "-"),
    };

    await this.copyTemplate(templatePath, projectPath, templateVars);
  }

  private async copyTemplate(
    templatePath: string,
    projectPath: string,
    templateVars: Record<string, any>,
  ): Promise<void> {
    const files = await fs.readdir(templatePath, { withFileTypes: true });

    for (const file of files) {
      const sourcePath = path.join(templatePath, file.name);
      let destPath = path.join(projectPath, file.name);

      // Handle special file names
      if (file.name === "_gitignore") {
        destPath = path.join(projectPath, ".gitignore");
      }

      if (file.isDirectory()) {
        await fs.ensureDir(destPath);
        await this.copyTemplate(sourcePath, destPath, templateVars);
      } else {
        if (file.name.endsWith(".template")) {
          // Render template file
          const content = await fs.readFile(sourcePath, "utf8");
          const rendered = Mustache.render(content, templateVars);
          const finalPath = destPath.replace(".template", "");
          await fs.writeFile(finalPath, rendered);
        } else {
          // Copy binary file as-is
          await fs.copy(sourcePath, destPath);
        }
      }
    }
  }
}
