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
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .resume {
    width: 100%;
  }

  header {
    text-align: center;
    margin-bottom: 30px;
  }

  h1 {
    font-size: 28px;
    margin-bottom: 10px;
  }

  .contact-info {
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
    padding-bottom: 5px;
    margin-bottom: 15px;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 5px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
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
    font-size: 14px;
    margin-bottom: 10px;
  }

  ul {
    margin-left: 20px;
    margin-bottom: 10px;
  }

  li {
    font-size: 14px;
    margin-bottom: 3px;
  }

  .skills-category {
    margin-bottom: 15px;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    list-style: none;
    margin-left: 0;
  }

  .skills-list li {
    background: #f5f5f5;
    padding: 3px 10px;
    border-radius: 15px;
    font-size: 13px;
  }

  .project-item {
    margin-bottom: 20px;
  }

  a {
    color: #2c3e50;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;