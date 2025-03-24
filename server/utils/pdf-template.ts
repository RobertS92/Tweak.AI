import { generateStyles } from './pdf-styles';

export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  const workExperience = sections.find((s: any) => s.id === 'work-experience')?.items || [];
  const education = sections.find((s: any) => s.id === 'education')?.items || [];
  const skills = sections.find((s: any) => s.id === 'skills')?.categories || [];
  const summary = sections.find((s: any) => s.id === 'professional-summary')?.content || '';
  const projects = sections.find((s: any) => s.id === 'projects')?.items || [];

  const contactParts = [];
  if (personalInfo?.email) contactParts.push(personalInfo.email);
  if (personalInfo?.phone) contactParts.push(personalInfo.phone);
  if (personalInfo?.location) contactParts.push(personalInfo.location);
  if (personalInfo?.website) contactParts.push(personalInfo.website);
  if (personalInfo?.linkedin) contactParts.push(personalInfo.linkedin);

  const contactLine = contactParts.join(' | ');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${generateStyles()}</style>
    </head>
    <body>
      <div class="resume">
        <header>
          <h1>${personalInfo?.name || ''}</h1>
          <div class="contact">${contactLine}</div>
        </header>

        ${summary ? `
        <section>
          <h2>Professional Summary</h2>
          <p>${summary}</p>
        </section>
        ` : ''}

        ${workExperience.length > 0 ? `
        <section>
          <h2>Work Experience</h2>
          ${workExperience.map(item => `
            <div class="experience-item">
              <div class="header">
                <h3>${item.title}</h3>
                <span class="date">${item.date}</span>
              </div>
              <div class="subtitle">${item.subtitle}</div>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${education.length > 0 ? `
        <section>
          <h2>Education</h2>
          ${education.map(item => `
            <div class="education-item">
              <div class="header">
                <h3>${item.title}</h3>
                <span class="date">${item.date}</span>
              </div>
              <div class="subtitle">${item.subtitle}</div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${skills.length > 0 ? `
        <section>
          <h2>Skills</h2>
          ${skills.map(category => `
            <div class="skills-category">
              <h3>${category.name}</h3>
              <ul>
                ${category.skills.map(skill => `<li>${skill}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${projects.length > 0 ? `
        <section>
          <h2>Projects</h2>
          ${projects.map(item => `
            <div class="project-item">
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};