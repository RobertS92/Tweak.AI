export const generateStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 850px;
    margin: 0 auto;
    padding: 40px;
  }

  .resume {
    width: 100%;
  }

  header {
    margin-bottom: 30px;
    text-align: center;
  }

  h1 {
    font-size: 28px;
    margin-bottom: 10px;
  }

  .contact {
    font-size: 14px;
    color: #666;
  }

  section {
    margin-bottom: 25px;
  }

  h2 {
    font-size: 20px;
    color: #2c3e50;
    border-bottom: 2px solid #eee;
    margin-bottom: 15px;
    padding-bottom: 5px;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 5px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }

  .date {
    font-size: 14px;
    color: #666;
  }

  .subtitle {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
  }

  p {
    margin-bottom: 10px;
    font-size: 14px;
  }

  .experience-item, .education-item, .project-item {
    margin-bottom: 20px;
  }

  .skills-category {
    margin-bottom: 15px;
  }

  ul {
    list-style-type: none;
    padding-left: 0;
  }

  li {
    display: inline-block;
    margin-right: 15px;
    margin-bottom: 8px;
    font-size: 14px;
  }
`;