// Import các module cần thiết
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

import OpenAI from "openai";

// Tạo ứng dụng Express
const app = express();
const port = 3001;


// Middleware để phân tích dữ liệu JSON
app.use(bodyParser.json());
app.use(cors());

app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
// Hàm thực thi chức năng gọi từ ChatGPT
const functions = {
  fetch_token_security: async (props) => {
    const contract_address = props.contract_address.toLowerCase();
    const url = 'https://api.gopluslabs.io/api/v1/token_security/8453';
    const params = {
      contract_addresses: contract_address
    };
    const headers = {
      'x-cg-demo-api-key': 'CG-fsX5bfdaGMmezZCai67gH1rT'
    }

    const response = await axios.get(url, { params, headers });
    console.log(response.data)
    return JSON.stringify(response.data);
  },
  fetch_trending_coins: async () => {
    const url = 'https://api.coingecko.com/api/v3/search/trending';

    const headers = {
      'x-cg-demo-api-key':'CG-fsX5bfdaGMmezZCai67gH1rT'
    }

    const response = await axios.get(url, { headers });

    return JSON.stringify(response.data);
  },
  search_coingecko: async (props) => {
    const keyword = props.query;
    console.log(keyword);
    const url = `https://api.coingecko.com/api/v3/search`;
    const headers = {
      'x-cg-demo-api-key':'CG-fsX5bfdaGMmezZCai67gH1rT'
    }
    const params = {
      query: keyword
    };
    const response = await axios.get(url, {params, headers });

    const fullCoinData = response.data.coins;
    const coinDataId = fullCoinData[0].id;

    const url2 = `const url = 'https://api.coingecko.com/api/v3/coins/coinDataId`;
    const response2 = await axios.get(url2, { headers });

    return JSON.stringify(response2.data);
  },
};

const tools = [{
  type: "function",
  function: {
    "name": "fetch_token_security",
    "description": "Fetches security details for a specific token using the GoPlus Labs API.",
    "parameters": {
      "type": "object",
      "required": [
        "contract_address",
      ],
      "properties": {
        "contract_address": {
          "type": "string",
          "description": "The Ethereum contract address of the token"
        }
      },
    }
  }
},
  {
    type: "function",
    function: {
      "name": "fetch_trending_coins",
      "description": "Fetches trending cryptocurrency data from the CoinGecko API",
      "strict": true,
      "parameters": {
        "type": "object",
        "required": [],
        "properties": {},
        "additionalProperties": false
      }
    }
  },{
    type: "function",
    function: {
      "name": "search_coingecko",
      "description": "Search for information about cryptocurrencies using the CoinGecko API",
      "strict": true,
      "parameters": {
        "type": "object",
        "required": [
          "query"
        ],
        "properties": {
          "query": {
            "type": "string",
            "description": "Search term for the cryptocurrency"
          }
        },
        "additionalProperties": false
      }
    }
  }
];

const messages = [
];

// API để xử lý ChatGPT với Function Calling
app.post('/chat', async (req, res) => {

  const { chat } = req.body;

  try {

  messages.push({
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": chat
      }
    ]
  })



  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools
  });

  const isToolCall = completion.choices[0].message?.tool_calls && completion.choices[0].message?.tool_calls.length > 0;
  if (isToolCall) {
    messages.push(completion.choices[0].message);
    for (const toolCall of completion.choices[0].message.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      const result = await functions[name](args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: [
          {
            type: "text",
            text: result
          }
        ]
      });
    }

    const completion2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools
    });



    return res.status(200).json(
        {
            message: completion2.choices[0].message.content,
        }
    );
  }

  return res.status(200).json({
    message: completion.choices[0].message.content,
  });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
        message: "Internal server error"
    });
    // return res.status(500).json({
    //     message: "Internal server error"
    // });
  }

  // console.log(req.body);
});


// Khởi chạy server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
