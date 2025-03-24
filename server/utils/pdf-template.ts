
export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: 'Georgia', serif;
          max-width: 850px;
          margin: 0 auto;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #2c5282;
          padding-bottom: 20px;
        }
        .name {
          font-size: 32px;
          font-weight: normal;
          margin-bottom: 10px;
          color: #2c5282;
        }
        .contact-info {
          font-size: 13px;
          color: #4a5568;
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 20px;
          color: #2c5282;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 15px;
          font-weight: normal;
        }
        .summary {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: #2d3748;
        }
        .experience-item, .education-item {
          margin-bottom: 20px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .item-title {
          font-weight: bold;
          color: #2d3748;
          font-size: 15px;
        }
        .item-subtitle {
          font-size: 14px;
          color: #4a5568;
        }
        .item-date {
          font-size: 13px;
          color: #718096;
        }
        .item-description {
          font-size: 13px;
          color: #4a5568;
          margin-top: 5px;
        }
        .skills-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .skill-category {
          margin-bottom: 15px;
        }
        .skill-category-title {
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .skill-list {
          font-size: 13px;
          color: #4a5568;
          list-style-type: none;
          padding-left: 0;
        }
        .skill-item {
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo.name || ''}</div>
        <div class="contact-info">
          ${personalInfo.email ? `<span>${personalInfo.email}</span>` : ''}
          ${personalInfo.phone ? `<span>${personalInfo.phone}</span>` : ''}
          ${personalInfo.location ? `<span>${personalInfo.location}</span>` : ''}
          ${personalInfo.website ? `<span>${personalInfo.website}</span>` : ''}
        </div>
      </div>

      ${sections.find(s => s.id === 'professional-summary')?.content ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${sections.find(s => s.id === 'professional-summary')?.content || ''}</div>
        </div>
      ` : ''}

      ${sections.find(s => s.id === 'work-experience')?.items?.length ? `
        <div class="section">
          <div class="section-title">Experience</div>
          ${sections.find(s => s.id === 'work-experience')?.items.map((item: any) => `
            <div class="experience-item">
              <div class="item-header">
                <div>
                  <div class="item-title">${item.title}</div>
                  <div class="item-subtitle">${item.subtitle}</div>
                </div>
                <div class="item-date">${item.date}</div>
              </div>
              <div class="item-description">${item.description}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${sections.find(s => s.id === 'education')?.items?.length ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${sections.find(s => s.id === 'education')?.items.map((item: any) => `
            <div class="education-item">
              <div class="item-header">
                <div>
                  <div class="item-title">${item.title}</div>
                  <div class="item-subtitle">${item.subtitle}</div>
                </div>
                <div class="item-date">${item.date}</div>
              </div>
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${sections.find(s => s.id === 'skills')?.categories?.length ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-section">
            ${sections.find(s => s.id === 'skills')?.categories.map((category: any) => `
              <div class="skill-category">
                <div class="skill-category-title">${category.name}</div>
                <ul class="skill-list">
                  ${category.skills.map((skill: string) => `
                    <li class="skill-item">${skill}</li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${sections.find(s => s.id === 'projects')?.items?.length ? `
        <div class="section">
          <div class="section-title">Projects</div>
          ${sections.find(s => s.id === 'projects')?.items.map((item: any) => `
            <div class="experience-item">
              <div class="item-title">${item.title}</div>
              <div class="item-description">${item.description}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${sections.find(s => s.id === 'certifications')?.items?.length ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${sections.find(s => s.id === 'certifications')?.items.map((item: any) => `
            <div class="experience-item">
              <div class="item-title">${item.title}</div>
              <div class="item-subtitle">${item.subtitle}</div>
              ${item.date ? `<div class="item-date">${item.date}</div>` : ''}
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </body>
    </html>
  `;
};
