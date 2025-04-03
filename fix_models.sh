#!/bin/bash

# Fix line 356
sed -i '356s/model: "gpt-4o".*/model: "gpt-4o",/' server/routes/interview-ai.ts

# Fix line 481
sed -i '481s/model: "gpt-4o".*/model: "gpt-4o",/' server/routes/interview-ai.ts

# Fix line 551
sed -i '551s/model: "gpt-4o".*/model: "gpt-4o",/' server/routes/interview-ai.ts

# Fix line 662
sed -i '662s/model: "gpt-4o".*/model: "gpt-4o",/' server/routes/interview-ai.ts

chmod +x fix_models.sh
./fix_models.sh
