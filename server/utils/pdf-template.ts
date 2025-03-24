import { generateStyles } from './pdf-styles';

export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  const workExperience = sections.find((s: any) => s.id === 'work-experience')?.items || [];
  const education = sections.find((s: any) => s.id === 'education')?.items || [];
  const skills = sections.find((s: any) => s.id === 'skills')?.categories || [];
  const summary = sections.find((s: any) => s.id === 'professional-summary')?.content || '';
  const projects = sections.find((s: any) => s.id === 'projects')?.items || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${generateStyles()}
      </style>
    </head>
    <body>
      <div class="resume">
        <header>
          <h1>${personalInfo?.name || ''}</h1>
          <div class="contact">${personalInfo?.email || ''} | ${personalInfo?.phone || ''} | ${personalInfo?.location || ''}</div>
        </header>

        ${summary ? `
        <section>
          <h2>Professional Summary</h2>
          <div class="summary">${summary}</div>
        </section>
        ` : ''}

        ${workExperience.length ? `
        <section>
          <h2>Work Experience</h2>
          ${workExperience.map((exp: any) => `
            <div class="experience">
              <div class="header">
                <h3>${exp.title}</h3>
                <span class="date">${exp.date}</span>
              </div>
              <div class="subheader">${exp.subtitle}</div>
              <p>${exp.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${education.length ? `
        <section>
          <h2>Education</h2>
          ${education.map((edu: any) => `
            <div class="education">
              <div class="header">
                <h3>${edu.title}</h3>
                <span class="date">${edu.date}</span>
              </div>
              <div class="subheader">${edu.subtitle}</div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${skills.length ? `
        <section>
          <h2>Skills</h2>
          ${skills.map((category: any) => `
            <div class="skills-category">
              <h3>${category.name}</h3>
              <ul>
                ${category.skills.map((skill: string) => `<li>${skill}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${projects.length ? `
        <section>
          <h2>Projects</h2>
          ${projects.map((project: any) => `
            <div class="project">
              <h3>${project.title}</h3>
              <p>${project.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};