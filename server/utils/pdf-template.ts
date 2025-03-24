import { generateStyles } from './pdf-styles';

export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  const workExperience = sections.find((s: any) => s.id === 'work-experience')?.items || [];
  const education = sections.find((s: any) => s.id === 'education')?.items || [];
  const skills = sections.find((s: any) => s.id === 'skills')?.categories || [];
  const summary = sections.find((s: any) => s.id === 'professional-summary')?.content || '';
  const projects = sections.find((s: any) => s.id === 'projects')?.items || [];
  const certifications = sections.find((s: any) => s.id === 'certifications')?.items || [];

  const contactParts = [];
  if (personalInfo?.email) contactParts.push(`<a href="mailto:${personalInfo.email}">${personalInfo.email}</a>`);
  if (personalInfo?.phone) contactParts.push(personalInfo.phone);
  if (personalInfo?.location) contactParts.push(personalInfo.location);
  if (personalInfo?.website) contactParts.push(`<a href="${personalInfo.website}">${personalInfo.website.replace(/^https?:\/\//, '')}</a>`);
  if (personalInfo?.linkedin) contactParts.push(`<a href="${personalInfo.linkedin}">LinkedIn</a>`);

  const contactLine = contactParts.join(' | ');

  return `
    <html>
    <head>
      <style>${generateStyles()}</style>
    </head>
    <body>
      <div class="resume">
        <header>
          <h1>${personalInfo?.name || ''}</h1>
          <div class="contact-info">${contactLine}</div>
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
          ${workExperience.map((item: any) => `
            <div class="section-item">
              <div class="header">
                <h3>${item.title}</h3>
                <div class="subtitle">${item.subtitle}</div>
                <div class="date">${item.date}</div>
              </div>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${education.length > 0 ? `
        <section>
          <h2>Education</h2>
          ${education.map((item: any) => `
            <div class="section-item">
              <div class="header">
                <h3>${item.title}</h3>
                <div class="subtitle">${item.subtitle}</div>
                <div class="date">${item.date}</div>
              </div>
              ${item.description ? `<p>${item.description}</p>` : ''}
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
              <div class="skills-list">${category.skills.join(', ')}</div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${projects.length > 0 ? `
        <section>
          <h2>Projects</h2>
          ${projects.map((item: any) => `
            <div class="section-item">
              <div class="header">
                <h3>${item.title}</h3>
                ${item.date ? `<div class="date">${item.date}</div>` : ''}
              </div>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${certifications.length > 0 ? `
        <section>
          <h2>Certifications</h2>
          ${certifications.map((item: any) => `
            <div class="section-item">
              <div class="header">
                <h3>${item.title}</h3>
                ${item.date ? `<div class="date">${item.date}</div>` : ''}
              </div>
              ${item.description ? `<p>${item.description}</p>` : ''}
            </div>
          `).join('')}
        </section>
        ` : ''}
        <div style="display:none">
          DEBUG Data:
          Education: ${JSON.stringify(education)}
          Skills: ${JSON.stringify(skills)}
          Projects: ${JSON.stringify(projects)}
        </div>
      </div>
    </body>
    </html>
  `;
};