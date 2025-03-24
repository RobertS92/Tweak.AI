
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
