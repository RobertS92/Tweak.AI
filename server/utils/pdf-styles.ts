
export const generateStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
  }

  body {
    padding: 40px;
  }

  .resume {
    max-width: 850px;
    margin: 0 auto;
  }

  header {
    text-align: center;
    margin-bottom: 30px;
  }

  h1 {
    font-size: 24px;
    margin-bottom: 10px;
  }

  h2 {
    font-size: 18px;
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    margin-bottom: 15px;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 5px;
  }

  .contact {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
  }

  section {
    margin-bottom: 25px;
  }

  .summary {
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .experience-item, .education-item, .project-item, .certification-item {
    margin-bottom: 20px;
  }

  .subtitle {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
  }

  .date {
    color: #666;
    font-size: 14px;
    margin-bottom: 5px;
  }

  p {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  ul {
    margin-left: 20px;
    margin-bottom: 10px;
  }

  li {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 3px;
  }

  .skills-category {
    margin-bottom: 15px;
  }

  .skills-category h3 {
    color: #444;
    margin-bottom: 8px;
  }
`;
export const generateStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Roboto', 'Open Sans', Arial, sans-serif;
  }
  
  @page {
    margin: 0.5in;
    size: letter portrait;
  }
  
  body {
    padding: 0;
    color: #333;
    line-height: 1.5;
  }
  
  .resume {
    max-width: 100%;
    margin: 0 auto;
  }
  
  header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #3498db;
  }
  
  h1 {
    font-size: 28px;
    margin-bottom: 8px;
    color: #2c3e50;
    font-weight: 700;
  }
  
  .contact {
    font-size: 14px;
    color: #555;
    line-height: 1.4;
  }
  
  section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  
  h2 {
    font-size: 18px;
    color: #2c3e50;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 5px;
    margin-bottom: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  h3 {
    font-size: 16px;
    margin-bottom: 4px;
    color: #3498db;
    font-weight: 600;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }
  
  .date {
    color: #7f8c8d;
    font-size: 14px;
    font-style: italic;
  }
  
  .subheader, .subtitle {
    font-size: 15px;
    color: #555;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  p {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 8px;
    text-align: justify;
  }
  
  ul {
    margin-left: 18px;
    margin-bottom: 10px;
  }
  
  li {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 4px;
    position: relative;
  }
  
  .experience-item, .education-item, .project-item, .certification-item {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px dotted #eaeaea;
  }
  
  .experience-item:last-child, .education-item:last-child, 
  .project-item:last-child, .certification-item:last-child {
    border-bottom: none;
  }
  
  .skills-category {
    margin-bottom: 12px;
  }
  
  .skills-category h3 {
    margin-bottom: 6px;
    font-size: 15px;
  }
  
  .skills-category ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style-type: none;
    margin-left: 0;
  }
  
  .skills-category li {
    background-color: #f5f5f5;
    padding: 4px 10px;
    border-radius: 15px;
    font-size: 13px;
    display: inline-block;
    margin-right: 5px;
    color: #444;
  }
  
  .summary {
    padding: 10px;
    background-color: #f9f9f9;
    border-left: 3px solid #3498db;
    margin-bottom: 20px;
    font-style: italic;
  }
  
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    a {
      text-decoration: none;
      color: #3498db;
    }
    
    section {
      page-break-inside: avoid;
    }
  }
`;
