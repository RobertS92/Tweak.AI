import { generateStyles } from './pdf-styles';

export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  const workExperience = sections.find((s: any) => s.id === 'work-experience')?.items || [];
  const education = sections.find((s: any) => s.id === 'education')?.items || [];
  const skills = sections.find((s: any) => s.id === 'skills')?.categories || [];
  const summary = sections.find((s: any) => s.id === 'professional-summary')?.content || '';
  const projects = sections.find((s: any) => s.id === 'projects')?.items || [];
  const certifications = sections.find((s: any) => s.id === 'certifications')?.items || [];

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

        ${workExperience.length > 0 ? `
        <section>
          <h2>Work Experience</h2>
          ${workExperience.map((item: any) => `
            <div class="experience-item">
              <h3>${item.title}</h3>
              <div class="subtitle">${item.subtitle}</div>
              <div class="date">${item.date}</div>
              <p>${item.description}</p>
              ${item.bullets?.length ? `
                <ul>
                  ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${education.length > 0 ? `
        <section>
          <h2>Education</h2>
          ${education.map((item: any) => `
            <div class="education-item">
              <h3>${item.title}</h3>
              <div class="subtitle">${item.subtitle}</div>
              <div class="date">${item.date}</div>
              ${item.description ? `<p>${item.description}</p>` : ''}
              ${item.bullets?.length ? `
                <ul>
                  ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${skills.length > 0 ? `
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

        ${projects.length > 0 ? `
        <section>
          <h2>Projects</h2>
          ${projects.map((item: any) => `
            <div class="project-item">
              <h3>${item.title}</h3>
              ${item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : ''}
              ${item.date ? `<div class="date">${item.date}</div>` : ''}
              <p>${item.description}</p>
              ${item.bullets?.length ? `
                <ul>
                  ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${certifications.length > 0 ? `
        <section>
          <h2>Certifications</h2>
          ${certifications.map((item: any) => `
            <div class="certification-item">
              <h3>${item.title}</h3>
              ${item.subtitle ? `<div class="subtitle">${item.subtitle}</div>` : ''}
              ${item.date ? `<div class="date">${item.date}</div>` : ''}
              ${item.description ? `<p>${item.description}</p>` : ''}
              ${item.bullets?.length ? `
                <ul>
                  ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </section>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};