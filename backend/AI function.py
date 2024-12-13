import aiohttp, asyncio
import time, jwt, json
from openai import OpenAI
import os

instruction = ''
path =  os.path.join(os.path.expanduser('~'), 'Desktop') + '/GPT Lawyer/'
with open(path+'backend/instruction.txt',encoding='utf-8') as file:
    instruction = file.read()

def generate_token(apikey: str, exp_seconds: int):
    try:
        id, secret = apikey.split(".")
    except Exception as e:
        raise Exception("invalid apikey", e)

    payload = {
        "api_key": id,
        "exp": int(round(time.time() * 1000)) + exp_seconds * 1000,
        "timestamp": int(round(time.time() * 1000)),
    }

    return jwt.encode(
        payload,
        secret,
        algorithm="HS256",
        headers={"alg": "HS256", "sign_type": "SIGN"},
    )


async def GLM4(prompt):
    message =[{"role": "user", "content": prompt}]
    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    data = {
        'messages': message,
        'model': 'glm-4',
        'temperature': 0.01,
        'top_p': 0.7,
        'max_token': 4096,
        'tools': [{
            'type':'function',
            'function':{
                'name':'add_annotation',
                'description': '调用这个函数可以为文件的某个段落添加批注，你应该多次调用这个函数以添加多个批注。',
                'parameters':{
                    "type": "object",
                    "properties": {
                        'comments':{
                            'type':'list',
                            
                            "citation": {
                                "type": "string",
                                "description": "这里写需要批注的段落的 html 标签 id，\
                                                一次只能引用一个 id，一个 id 只能被引用一次。",
                            },
                            "annotation": {
                                "type": "string",
                                "description": "这里写对此处的批注，注重文字内容，而不是 html 标签。",
                            }
                        }
                    },
                    "required": ["paragraph_id","annotation"],
                }
            }
        }]
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': generate_token('39159c1e7bc5e92912b9e3b7e0bf2af8.ttGPquhUencJAQs3',100),
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=headers) as resp:
            resp = await resp.text()
            resp = json.loads(resp)
            print(resp)
            # tool_calls = resp['choices'][0]['message']['tool_calls']
            # print(content)
            return resp


async def models(prompt, model = 'gpt-4'):
    url="https://flag.smarttrot.com/v1/chat/completions"
    api_secret_key = 'sk-zk23b8914909928d450c56f08f6053c55eb65b20e0af1b4a';  # 你的api_secret_key
    headers = {'Content-Type': 'application/json', 'Accept':'application/json',
               'Authorization': "Bearer " + api_secret_key}
    params = {'user':'用户','model':model,
              'messages':[{'role':'user', 'content': prompt}]}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=params, headers=headers) as resp:
            resp = await resp.text()
            resp = json.loads(resp)
            content = resp['choices'][0]['message']['content']
            print(content)
            return content, resp


async def ask(prompt):
    print('---------------批注部分---------------')
    return await GLM4(prompt)
        

def seperate(document, num = 4000):
    max_length = len(document) // (len(document)//num + 1)
    document = document.split('</p>')
    parts = []
    part = ''
    for i in document:
        if len(part)+len(i) > max_length:
            parts.append(part)
            part = ''
        part += i
    if part!='':
        parts.append(part)
    print('长度: ',max_length, '次数: ', len(parts))
    return parts


async def prepare(document, summarization, knowledge, knowledge_sum):
    print('---------------准备部分---------------')
    tasks, histories = [], []
    if summarization=='':
        prompt = '下面是一个合同文件，请简要概述。不要重复指令，直接回答。\n\n' + document
        tasks.append(asyncio.create_task(GLM4(prompt)))

    if knowledge!='' and knowledge_sum=='':
        prompt = f'下面是知识库：\n{knowledge}\n\n知识库结束。\n整理出知识库中的所有要点，不要重复指令。'
        tasks.append(asyncio.create_task(GLM4(prompt)))
    
    if len(tasks) > 0:
        done, _ = await asyncio.wait(tasks)
        need, done = 0, list(done)
        if summarization=='':
            history = done[0].result()
            summarization = history['choices'][0]['message']['content']
            histories.append(history)
            need = 1
        if knowledge!='' and knowledge_sum=='':
            history = done[need].result()
            knowledge_sum = history['choices'][0]['message']['content']
            histories.append(history)

    return summarization, knowledge_sum, histories


def get_instruction(summarization, request, knowledge, passage):
    inst = instruction.replace('{{summarization}}', summarization)
    inst = inst.replace('{{passage}}', passage)
    if len(knowledge) > 0:
        inst = inst.replace('{{knowledge}}',f'知识库：\n{knowledge}\n知识库结束。')
        if len(request) > 0:
            inst = inst.replace('{{request}}',request + '批注时参考上面的知识库。')
        else:
            inst = inst.replace('{{request}}', '根据上面的知识库批注出修改建议。')
    else:
        inst = inst.replace('{{knowledge}}\n', '')
        if len(request) > 0:
            inst = inst.replace('{{request}}',request)
        else:
            inst = inst.replace('{{request}}', '找出合同中存在的问题，批注出修改建议。')
    return inst


async def ask_AI(document, summarization, websocket, request, knowledge, knowledge_sum):
    parts = seperate(document)
    histories = []

    await websocket.send_text(str(50))
    summarization, knowledge_sum, history = await prepare(document, summarization, knowledge, knowledge_sum)
    histories.extend(history)

    res, tasks = [], []
    for part in parts:
        prompt = get_instruction(summarization, request, knowledge_sum, part)
        tasks.append(asyncio.create_task(ask(prompt)))

    await websocket.send_text(str(90))
    done, _ = await asyncio.wait(tasks)

    for done_task in done:
        history = done_task.result()
        histories.append(history)
        tool_calls = history['choices'][0]['message']['tool_calls']
        res += [json.loads(tool_call['function']['arguments']) for tool_call in tool_calls]
    
    print(res)
    # res = [{'citation':'p0','annotation':'这里有错误'},{'citation':'p3','annotation':'这里有错误'},{'citation':'t0p0','annotation':'这里有错误'}]
    # summarization = '总结'
    return res, summarization, knowledge_sum, histories


if __name__=='__main__':
    pass