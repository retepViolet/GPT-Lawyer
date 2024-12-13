import aiohttp, asyncio
import time, jwt, json
from openai import AsyncOpenAI
import os

GLM_queue = asyncio.Queue(maxsize = 10)   # 最大并发数
GPT_queue = asyncio.Queue(maxsize = 10)   # 最大并发数
instruction, instruction2 = '', ''
path =  os.path.join(os.path.expanduser('~'), 'Desktop') + '/GPT Lawyer/'
with open(path+'backend/instruction.txt',encoding='utf-8') as file:
    instruction = file.read()
with open(path+'backend/instruction2.txt',encoding='utf-8') as file:
    instruction2 = file.read()

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
    await GLM_queue.put(1)
    print('---------------GLM')
    message =[{"role": "user", "content": prompt}]
    url = "http://open.bigmodel.cn/api/paas/v4/chat/completions"
    data = {
        'messages': message,
        'model': 'glm-4',
        'temperature': 0.01,
        'top_p': 0.7,
        'max_token': 4096,
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': generate_token('39159c1e7bc5e92912b9e3b7e0bf2af8.ttGPquhUencJAQs3',100),
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=headers) as resp:
            resp = await resp.text()
            resp = json.loads(resp)
            await GLM_queue.get()
            try: 
                content = resp['choices'][0]['message']['content']
                print('---------------AI回复：\n',content)
                return content, resp
            except: 
                print('---------------GLM报错')
                print(resp)
                return '', resp


async def GLM4_stream(prompt):
    print('---------------GLM')
    message =[{"role": "user", "content": prompt}]
    url = "http://open.bigmodel.cn/api/paas/v4/chat/completions"
    data = {
        'messages': message,
        'model': 'glm-4',
        'max_token': 4096,
        'stream': True
    }
    headers = {
        'Accept': 'application/json',
        'Authorization': generate_token('39159c1e7bc5e92912b9e3b7e0bf2af8.ttGPquhUencJAQs3',100),
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=headers) as resp:
            print(resp.content_type)
            async for data in resp.content:
                yield json.loads(data)


async def GPT4(prompt):
    url="https://flag.smarttrot.com/v1/chat/completions"
    api_secret_key = 'sk-zk23b8914909928d450c56f08f6053c55eb65b20e0af1b4a';  # 你的api_secret_key
    client = AsyncOpenAI(api_key = api_secret_key, base_url = url)
    resp = await client.chat.completions.create(
        model = "GPT-4",
        messages = [
            {"role": "system", "content": "你是一名律师。"},
            {"role": "user", "content": prompt}
        ]
    )
    print(resp.model_dump_json())
    return resp


async def models(prompt, model = 'gpt-4'):
    url="https://flag.smarttrot.com/v1/chat/completions"
    api_secret_key = 'sk-zk23b8914909928d450c56f08f6053c55eb65b20e0af1b4a';  # 你的api_secret_key
    headers = {'Content-Type': 'application/json', 'Accept':'application/json',
               'Authorization': "Bearer " + api_secret_key}
    params = {'user':'用户','model': model,
              'messages':[{'role':'user', 'content': prompt}]}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=params, headers=headers) as resp:
            resp = await resp.text()
            GPT_queue.get()
            resp = json.loads(resp)
            try: 
                content = resp['choices'][0]['message']['content']
                print(content)
                return content, resp
            except: 
                print(resp)
                return '', resp


async def ask(prompt):
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
    print('---------------长度: ',max_length, '次数: ', len(parts))
    return parts


async def prepare(document, parts, summarization, knowledge):
    tasks, histories = [], []
    
    if summarization=='':
        prompt = '下面是一个合同文件，请简要概述。不要重复指令，直接回答。\n\n' + document
        tasks.append(GLM4(prompt))

    if len(knowledge) > 0:
        num = max(len(knowledge)//len(parts),1)
        print('知识库主题数量限制：', num)
        kn_list = ''
        for i, chapter in enumerate(knowledge):
            kn_list += str(i) + '. ' + chapter.name + '\n'
        for part in parts:
            prompt = get_instruction2(part, kn_list, num)
            tasks.append(GLM4(prompt))
    
    kn_id = []
    if len(tasks) > 0:
        done = await asyncio.gather(*tasks)
        need, done = 0, list(done)
        if summarization=='':
            summarization, history = done[0]
            histories.append(history)
            need = 1
        for i in range(need, len(tasks)):
            resp, history = done[i]
            try:
                buf = json.loads(resp[resp.find('['):resp.rfind(']')+1])
            except:
                buf = []
                print(i, '读取知识列表失败', resp)
            kn_id.append(buf)
            histories.append(history)

    return summarization, kn_id, histories


def get_instruction(summarization, request, knowledge, passage):
    if knowledge == '': knowledge = '知识库为空，批注时无需参考知识库。'
    if request == '': request = '找出合同中存在的问题，批注出修改建议。'
    inst = instruction.replace('{{summarization}}', summarization) \
            .replace('{{passage}}', passage) \
            .replace('{{knowledge}}', knowledge) \
            .replace('{{request}}',request)
    return inst


def get_instruction2(passage, kn_list, num):
    return instruction2.replace('{{passage}}', passage)\
            .replace('{{kn_list}}',kn_list)\
            .replace('{{num}}',str(num))


async def ask_AI(document, summarization, websocket, request, knowledge):
    parts = seperate(document)
    histories = []

    await websocket.send_text(str(50))
    print('---------------开始准备---------------')
    summarization, kn_id, history = await prepare(document, parts, summarization, knowledge)
    histories.extend(history)
    print('被选中的章节：', kn_id)

    print('---------------开始批注---------------')
    res, tasks = [], []
    for i, part in enumerate(parts):
        kn_str = ''
        if len(knowledge)>0:
            for id in kn_id[i]:
                kn_str += '“'+knowledge[id].name+'”的审查要点：\n'+ knowledge[id].content + '\n\n'
        prompt = get_instruction(summarization, request, kn_str, part)
        tasks.append(ask(prompt))

    await websocket.send_text(str(90))
    done = await asyncio.gather(*tasks)

    for cnt, done_task in enumerate(done):
        resp, history = done_task
        histories.append(history)
        buf = []
        
        cite_str = ''
        if len(knowledge)>0 and len(kn_id[cnt])>0:
            cite_str = '参考：'
            for id in kn_id[cnt]:
                cite_str += knowledge[id].name+'、'
            cite_str = cite_str[:-1] + '。'
            print('cite_str: ', cite_str)

        try: buf = json.loads(resp[resp.find('['):resp.rfind(']')+1])
        except: 
            print('无法读取 json')
            await websocket.send_text('error')
        else:
            for i in range(len(buf)):
                buf[i]['knowledge'] = cite_str
            res += buf
    
    # res = [{'citation':'p0','annotation':'这里有错误'},{'citation':'p3','annotation':'这里有错误'},{'citation':'t0p0','annotation':'这里有错误'}]
    # summarization = '总结'
    return res, summarization, histories


async def chat_AI(message, websocket):
    print('---------------开始对话---------------')
    await GLM_queue.put(1)
    print('---------------GLM')
    
    print(message)
    url = "http://open.bigmodel.cn/api/paas/v4/chat/completions"
    data = {
        'messages': message,
        'model': 'glm-4',
        'max_token': 4096,
        'stream': True
    }
    headers = {
        'Accept': 'application/json',
        'Authorization': generate_token('39159c1e7bc5e92912b9e3b7e0bf2af8.ttGPquhUencJAQs3',100),
    }
    
    total_tokens = 0
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json = data, headers = headers) as resp:
            async for part in resp.content:
                part = part.decode('utf-8')
                if part.find('data: {')!=0: continue
                part = json.loads(part[6:])
                content = part["choices"][0]["delta"]["content"]
                await websocket.send_text(content)

                if 'usage' in part:
                    total_tokens = part['usage']['total_tokens']
                    print(total_tokens)

    await websocket.close()
    await GLM_queue.get()
    return total_tokens

if __name__=='__main__':
    pass