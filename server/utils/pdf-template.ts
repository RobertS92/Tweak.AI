
export const generatePDFTemplate = (resumeData: any) => {
  const { personalInfo, sections } = resumeData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: 'Arial', sans-serif;
          max-width: 850px;
          margin: 0 auto;
          padding: 40px;
          color: #2d3748;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .contact-info {
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          border-bottom: 2px solid #4299e1;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .item {
          margin-bottom: 15px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .item-title {
          font-weight: bold;
        }
        .item-subtitle {
          color: #4a5568;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo.name}</div>
        <div class="contact-info">
          ${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}
          ${personalInfo.linkedin ? `| ${personalInfo.linkedin}` : ''}
        </div>
      </div>
      
      ${sections.map(section => {
        if (section.id === 'professional-summary') {
          return `
            <div class="section">
              <div class="section-title">${section.title}</div>
              <p>${section.content}</p>
            </div>
          `;
        }
        
        if (['work-experience', 'education', 'projects'].includes(section.id)) {
          return `
            <div class="section">
              <div class="section-title">${section.title}</div>
              ${section.items.map(item => `
                <div class="item">
                  <div class="item-header">
                    <span class="item-title">${item.title}</span>
                    <span class="item-subtitle">${item.date}</span>
                  </div>
                  <div class="item-subtitle">${item.subtitle}</div>
                  ${item.description ? `<p>${item.description}</p>` : ''}
                  ${item.bullets && item.bullets.length > 0 ? `
                    <ul>
                      ${item.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }
        
        if (section.id === 'skills' && section.categories) {
          return `
            <div class="section">
              <div class="section-title">${section.title}</div>
              <div class="skills-grid">
                ${section.categories.map(category => `
                  <div>
                    <strong>${category.name}:</strong>
                    <p>${category.skills.join(', ')}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
        
        return '';
      }).join('')}
    </body>
    </html>
  `;
};
