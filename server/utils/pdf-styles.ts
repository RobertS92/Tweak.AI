
export const generateStyles = () => `
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
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
    color: #2c5282;
    margin: 0 0 10px 0;
    font-size: 28px;
  }
  
  h2 {
    color: #2c5282;
    border-bottom: 2px solid #2c5282;
    margin: 25px 0 15px 0;
    font-size: 20px;
  }
  
  h3 {
    margin: 0;
    font-size: 16px;
  }
  
  .contact {
    font-size: 14px;
    color: #666;
  }
  
  section {
    margin-bottom: 25px;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  
  .date {
    color: #666;
    font-size: 14px;
  }
  
  .subheader {
    color: #666;
    font-size: 14px;
    margin-bottom: 5px;
  }
  
  .summary {
    margin-bottom: 20px;
  }
  
  .experience, .education, .project {
    margin-bottom: 20px;
  }
  
  ul {
    margin: 5px 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 3px;
  }
  
  .skills-category {
    margin-bottom: 15px;
  }
  
  p {
    margin: 5px 0;
    font-size: 14px;
  }
`;
