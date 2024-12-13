from fastapi import FastAPI, File, UploadFile, Query, Form, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from file import word_to_html, html_to_word, written_to_word
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from urllib.parse import quote
from prisma import Prisma
import win32com.client
from AI import ask_AI, chat_AI
from typing import List
import aiofiles, asyncio
import re, os, json, random, aiohttp, io


db = Prisma()
path =  os.path.join(os.path.expanduser('~'), 'Desktop') + '\\GPT Lawyer\\'
temp_file = asyncio.Queue()
# download_queue = asyncio.Queue()  # 定义一个异步队列

async def clear_trash():
    while True:
        await asyncio.sleep(60*60*24)
        print('清除回收站')
        files = await db.file.find_many(where={'delete':True})
        for i in range(len(files)):
            file = files[i]
            if (datetime.now(tz=timezone.utc)-file.updatedAt).days > 30:
                await db.suggestion.delete_many(where={'file_id':file.id})
                await db.file.delete(where={'id':file.id})

@asynccontextmanager
async def lifespan(_app: FastAPI):
    await db.connect()
    # word_app = None
    # word_app = win32com.client.DispatchEx("Word.Application")
    # word_app.Visible = True
    # asyncio.create_task(html_to_word2(download_queue, word_app))
    asyncio.create_task(clear_trash())
    yield
    # word_app.Quit()
    await db.disconnect()

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory=path), name="static")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中请更加谨慎地配置
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有 HTTP 头
)
exist_file1 = open(path+'backend/说明书.docx', 'rb').read()
exist_file2 = open(path+'backend/采购合同知识库.docx', 'rb').read()

#page -----------------------------------

@app.get("/")
async def index_page():
    return FileResponse(path+'index/index.html', media_type="text/html")

@app.get("/chat")
async def chat_page():
    return FileResponse(path+'chat/chat.html', media_type="text/html")

@app.get("/file")
async def file_page():
    return FileResponse(path+"editor/editor.html", media_type="text/html")

@app.get("/trash")
async def trash_page():
    return FileResponse(path+"trash/trash.html", media_type="text/html")

@app.get("/stat")
async def trash_page():
    return FileResponse(path+"stat/stat.html", media_type="text/html")

@app.get("/knowledge")
async def knowledge_page():
    return FileResponse(path+"book/book.html", media_type="text/html")

@app.get("/account")
async def account_page():
    return FileResponse(path+"account/account.html", media_type="text/html")

@app.get("/about")
async def about_page():
    return FileResponse(path+"about/about.html", media_type="text/html")

@app.get("/login")
async def login_page():
    return FileResponse(path+"login/login.html", media_type="text/html")

@app.get("/console0328")
async def console():
    return FileResponse(path+'console/console.html', media_type="text/html")

@app.get("/console0328_data")
async def console_data():
    users = await db.user.find_many()
    files = await db.file.find_many()
    history = await db.history.find_many()
    return {
        'users':users,
        'files':files,
        'history':history
    }

#request --------------------------------

@app.post('/login')
async def login(phone: str = Form(), password: str = Form()):
    user = await db.user.find_unique(
        where={
            'phone':phone,
            'password':password
        }
    )
    if user == None:
        return 'error'
    return user.id


@app.post('/register')
async def register(username: str = Form(), password: str = Form(), phone: str = Form()):
    user = await db.user.create(
        data = {
            'username': username,
            'password': password,
            'phone': phone
        }
    )
    await add_existed_files(user.id)
    return user

async def add_existed_files(uid):
    # 网站使用说明书
    new_file = await db.file.create(
        data={
            'name': '说明书',
            'author_id': uid,
            'knowledge': False
        },
    )
    file_path = path+'backend/files/'+str(new_file.id)+'.docx'
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(exist_file1)
    await db.file.update(
        where={'id':new_file.id},
        data={
            'content':word_to_html(file_path),
            'summarization': '网站使用说明书。',
            'num': 3
        }
    )
    await db.suggestion.create(data={
        'citation': 'p3',
        'annotation': '这里是 AI 的批注。',
        'index': 1,
        'file_id': new_file.id
    })
    await db.suggestion.create(data={
        'citation': 'p4',
        'annotation': '试一试“右箭头”和“左箭头”。',
        'index': 2,
        'file_id': new_file.id
    })
    await db.suggestion.create(data={
        'citation': 'p5',
        'annotation': '试一试“接受”和“忽略”。',
        'index': 3,
        'file_id': new_file.id
    })


@app.post('/password_reset')
async def password_reset(phone: str = Form(), password: str = Form()):
    user = await db.user.find_unique(where = {'phone': phone})
    user = await db.user.update(
        where = {'id': user.id},
        data = {'password': password}
    )
    return user


@app.get('/get_user')
async def get_user(uid: str = Query()):
    user = await db.user.find_unique(
        where = {'id':uid},
        include = {
            'history':{
                'order_by': {'id':'desc'}
            }
        }
    )
    return user 


@app.post("/upload")
async def upload(file: UploadFile = File(media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                 uid: str=Query()):
    if not await get_user(uid): return
    new_file = await db.file.create(
        data={
            'name': file.filename[:file.filename.rfind('.')],
            'author_id': uid,
        },
    )
    file_path = path+'backend/files/'+str(new_file.id)+'.docx'
    async with aiofiles.open(file_path,'wb') as f:
        await f.write(file.file.read())
    await db.file.update(
        where={'id':new_file.id},
        data={'content':word_to_html(file_path)}
    )
    return new_file


@app.post("/new_file")
async def new_file(uid: str=Query()):
    user = await get_user(uid)
    if not user: return
    file = await db.file.create(data = {'author_id':uid})
    return file


@app.get("/download")
async def download(id: int = Query(), uid: str=Query()):
    file = await db.file.find_unique(where={"id": id},include={"suggestions": True})
    file_path = path + f'backend\\files\\{id}.docx'
    if file.author_id != uid:
        return '无权访问'
    suggestions = await db.suggestion.find_many(where={'file_id':id})
    await asyncio.to_thread(html_to_word, file.content, file_path, suggestions)
    return FileResponse(file_path+'.download', media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@app.post("/save_title")
async def save_file(id: int = Query(), title: str = Query(), uid: str=Query()):
    file = await db.file.find_unique(where={'id':id})
    if file.author_id != uid:
        return
    
    file = await db.file.update(
        where={'id':id},
        data={
            'name': title,
            'changed': True
        }
    )
    return file


@app.websocket("/get_suggestions")
async def get_suggestions(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()
    id, request, uid, knowledge_id = data.get('id'), data.get('request'), data.get('uid'), data.get('knowledge_id')

    user = await db.user.find_unique(where={'id':uid})
    if user.balance <= 0:
        await websocket.send_text('balance')
        await websocket.close()
        return

    file = await db.file.find_unique(where={'id':id})
    if file.author_id != uid:
        await websocket.send_text('error')
        await websocket.close()
        return
    index = file.content.find('</style>')
    if index > -1:
        file.content = file.content[index + len('</style>'):]
    
    knowledge = []
    if knowledge_id != 'null':
        knowledge = await db.knowledge_file.find_unique(where={'id':int(knowledge_id)},include={'chapter':True})
        if knowledge.author_id != uid:
            await websocket.send_text('error')
            await websocket.close()
            return
        knowledge = knowledge.chapter

    suggestions, summarization, history = await ask_AI(file.content, file.summarization, 
                                              websocket, request, knowledge)

    cnt = 0
    for s in suggestions:
        index = file.content.find(f"id=\"{s['citation']}\"")
        if index != -1 and s['annotation']!='none':
            await db.suggestion.create(
                    data={
                        'citation': s['citation'],
                        'annotation': s['annotation'],
                        'knowledge': s['knowledge'],
                        'file_id': id,
                        'index': index
                    }
                )
            cnt += 1

    await db.file.update(
        where={'id':id},
        data={
            'summarization':summarization,
            'num': cnt
        }
    )

    tot_cost, tot_token = 0, 0
    for h in history:
        cost = h['usage']['total_tokens'] / 1000 * 0.1
        tot_cost += cost
        tot_token += h['usage']['total_tokens']

    await db.history.create(data = {
        'model': '批注',
        'token': tot_token,
        'cost': tot_cost,
        'detail': json.dumps(history),
        'time': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'uid': uid,
        'file_name': file.name
    })
    
    await db.user.update(
        where = {'id': uid},
        data = {'balance': {'decrement': tot_cost}}
    )
    await websocket.close()


@app.websocket("/get_writing")
async def get_writing(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()
    message, uid, file_num, books = \
        data.get('message'), data.get('uid'), data.get('file_num'), data.get('books')
    files = []
    for _ in range(file_num):
        files.append(await websocket.receive_bytes())
    
    user = await db.user.find_unique(where={'id':uid})
    if user.balance <= 0:
        await websocket.send_text('balance')
        await websocket.close()
        return
    
    # 读取知识库
    if len(books)>0:
        knowledge_str = "\n请根据知识库回答：\n'''\n"
        for id in books:
            id = int(id)
            book = await db.knowledge_file.find_unique(where={'id':id}, include={'chapter':True})
            knowledge_str += '\n' + book.name + '文件：\n'
            if book.author_id != uid:
                continue
            for chapter in book.chapter:
                knowledge_str += '\n' + chapter.name + '章节：\n' + chapter.content + '\n'
        knowledge_str += "\n'''\n知识库结束。\n"
        message[-1]['content'] += knowledge_str
        print(knowledge_str)

    # 读取文件
    print(len(files))
    if len(files) > 0:
        for file in files:
            file_path = path+'backend/files/'+str(temp_file.qsize())+' temp'+'.docx'
            await temp_file.put(1)
            async with aiofiles.open(file_path,'wb') as f:
                await f.write(file)
                file_str = word_to_html(file_path)
                message[-1]['content'] += "\n下面是用户上传的一个文件：\n'''\n"+file_str[file_str.find('</style>')+8:]+"'''\n"
   
    tot_tokens = await chat_AI(message, websocket)
    tot_cost = tot_tokens / 1000 * 0.1

    await db.user.update(
        where = {'id' : uid},
        data = {'balance': {'decrement': tot_cost}}
    )

    await db.history.create(data = {
        'model': '问答',
        'token': tot_tokens,
        'cost': tot_cost,
        'detail': 'none',
        'time': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'uid': uid,
        'file_name': '问答页面'
    })
    

@app.post('/edit_suggestion')
async def edit_suggestion(id: int=Query(), uid: str=Query(), status: int=Query()):
    suggest = await db.suggestion.find_unique(where={'id':id})
    file = await db.file.find_unique(where={'id':suggest.file_id})
    if file.author_id != uid:
        return '无权访问'
    await db.suggestion.update(where={'id':id}, data={'status':status})
    if suggest.status == 0:
        await db.file.update(where={'id':file.id}, data={'num':file.num-1})
        

@app.get("/get_file")
async def get_file(id: int = Query(), uid: str=Query()):
    file = await db.file.find_unique(
        where={'id':id},
        include={
            'suggestions':{
                'order_by': {'index':'asc'}
            }
        }
    )
    if file.author_id != uid:
        return
    return file


@app.get("/get_all_file")
async def get_all_file(uid: str=Query(), delete: bool=Query(False)):
    files = await db.file.find_many(
        where={
            'delete': delete,
            'author_id': uid,
        },
        order={'updatedAt': 'desc'}
    )
    for file in files:
        index = file.content.find('</style>')
        if index != -1:
            file.content = file.content[index+len('</style>'):]
        file.content = file.content[:200]
    return files


@app.delete("/delete_file")
async def delete_file(id: int = Query(), uid: str=Query()):
    file = await db.file.find_unique(where={'id':id})
    if file.author_id != uid:
        return
    file = await db.file.update(
        where={'id':id},
        data={'delete':True}
    )
    return file


@app.post("/restore")
async def restore(id: int = Query(), uid: str=Query()):
    file = await db.file.find_unique(where={'id':id})
    if file.author_id != uid:
        return
    file = await db.file.update(where={'id':id},data={'delete':False})
    return file


@app.delete("/real_delete_file")
async def real_delete_file(id: List[int] = Query([]), uid: str=Query()):
    file = None
    for i in id:
        file = await db.file.find_unique(where={'id':i})
        if file.author_id != uid:
            continue
        await db.suggestion.delete_many(where={'file_id':i})
        await db.file.delete(where={'id':i})
        file_path = path+'backend/files/'+str(file.id)+'.docx'
        if os.path.exists(file_path):
            await asyncio.to_thread(os.remove, file_path)
        if os.path.exists(file_path+'.download'):
            await asyncio.to_thread(os.remove, file_path+'.download')
    return file


@app.post("/pay")
async def pay(uid: str = Query(), openid: str = Query(''), fee: float = Query(), status: str = Query('')):
    user = await get_user(uid)
    if user == None:
        return
    user = await db.user.update(
            where={'id': uid},
            data={'balance': user.balance + fee}
        )
    await db.pay.create(data={
        'money': fee,
        'uid': uid
    })
    return user

    if openid == '':
        url = f'https://xorpay.com/api/openid/699325?callback={IP}/pay?uid={uid}&fee={fee}'
        async with aiohttp.ClientSession() as session:
            session.post(url)
        return
    if status == 'ok':
        user = await db.user.update(
            where={'id': uid},
            data={'balance': user.balance + fee}
        )
        await db.pay.create(data={
            'money': fee,
            'uid': uid
        })
    
    async with aiohttp.ClientSession() as session:
        url = f'https://xorpay.com/api/pay/699325?\
                name={quote("GPT Lawyer")}\
                &pay_type=native\
                &price={fee}\
                &order_id={await db.pay.count()}'
        async with session.post(url) as resp:
            resp = await resp.text()


@app.get('/get_sms')
async def get_sms(phone: str = Query()):
    return 123
    code = random.randint(100000, 999999)
    url = "https://gyytz.market.alicloudapi.com/sms/smsSend"
    appcode = 'bb10d1a5a23e4eaca459a1434237532a'
    smsSignId = "2dd2e13deff84ed7903e7866514219bc"
    templateId = "038a7b22ff914442896d2f563670b08f"
    param = f'**code**:{code}'
    data = {"mobile":phone, "smsSignId":smsSignId, "templateId":templateId, "param":param}
    headers = {"Content-Type":"application/x-www-form-urlencoded","Authorization":"APPCODE "+appcode}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data = data, headers=headers) as resp:
            resp = await resp.text()
            print (resp, code)
    return code


# 知识树------------
@app.get('/get_knowledge')
async def get_knowledge(uid: str=Query()):
    res = await db.user.find_unique(where={'id':uid},
                                    include={'knowledge':{'include':{'file':{'include':{'chapter':True}}}}})
    for kn_class in res.knowledge:
        for file in kn_class.file:
            for chapter in file.chapter:
                chapter.content = ''
    if res:
        return res.knowledge
    return '用户ID错误'


@app.get('/get_kn_file')
async def get_kn_file(uid: str=Query(), file_id: int=Query()):
    file = await db.knowledge_file.find_unique(where={'id':file_id},include={'chapter':True})
    if file.author_id != uid:
        return '无权访问'
    return file


@app.post('/save_kn_chapter')
async def save_chapter(uid: str=Query(), chapter_id: int=Query(), type: str=Query(), content: str=Query()):
    chapter = await db.knowledge_chapter.find_unique(where={'id':chapter_id})
    if chapter.author_id != uid:
        return '无权访问'
    if type == 'title':
        await db.knowledge_chapter.update(where={'id':chapter_id}, data={'name':'未命名' if content=='' else content})
    else:
        await db.knowledge_chapter.update(where={'id':chapter_id}, data={'content':content})


@app.post('/rename_kn')
async def rename_kn(uid: str=Query(), type: str=Query(), id: int=Query(), new_name: str=Query()):
    if type == 'class':
        data = await db.knowledge_class.find_unique(where={'id':id})
        if data.author_id != uid:
            return '无权访问'
        await db.knowledge_class.update(where={'id':id}, data={'name':new_name})
    elif type == 'file':
        data = await db.knowledge_file.find_unique(where={'id':id})
        if data.author_id != uid:
            return '无权访问'
        await db.knowledge_file.update(where={'id':id}, data={'name':new_name})
    elif type == 'chapter':
        data = await db.knowledge_chapter.find_unique(where={'id':id})
        if data.author_id != uid:
            return '无权访问'
        await db.knowledge_chapter.update(where={'id':id}, data={'name':new_name})


@app.post('/new_kn_class')
async def new_kn_class(uid: str = Query(), class_name: str = Query()):
    if not await get_user(uid):
        return '用户ID错误'
    kn_class = await db.knowledge_class.create(data={'name':class_name, 'author_id':uid})
    return kn_class.id


@app.delete('/delete_kn_class')
async def delete_kn_class(uid: str = Query(), class_id: int = Query()):
    kn_class = await db.knowledge_class.find_unique(where={'id':class_id}, include={'file':True})
    if kn_class.author_id != uid:
        return '无权访问'
    for file in kn_class.file:
        await db.knowledge_chapter.delete_many(where={'file_id':file.id})
        await db.knowledge_file.delete(where={'id':file.id})
    await db.knowledge_class.delete(where={'id':class_id})


@app.post('/new_kn_file')
async def new_kn_file(uid: str = Query(), class_id: int = Query(), file_name: str = Query()):
    kn_class = await db.knowledge_class.find_unique(where={'id':class_id})
    if kn_class.author_id != uid:
        return '无权访问'
    kn_file = await db.knowledge_file.create(data={'name':file_name, 'class_id':class_id, 'author_id':uid})
    return kn_file.id


@app.delete('/delete_kn_file')
async def delete_kn_file(uid: str = Query(), file_id: int = Query()):
    kn_file = await db.knowledge_file.find_unique(where={'id':file_id})
    if kn_file.author_id != uid:
        return '无权访问'
    await db.knowledge_chapter.delete_many(where={'file_id':file_id})
    await db.knowledge_file.delete(where={'id':file_id})


@app.post('/new_kn_chapter')
async def new_kn_chapter(uid: str = Query(), file_id: int = Query(), chapter_name: str = Query()):
    kn_file = await db.knowledge_file.find_unique(where={'id':file_id})
    if kn_file.author_id != uid:
        return '无权访问'
    kn_chapter = await db.knowledge_chapter.create(data={'name':chapter_name, 'file_id':file_id, 'author_id':uid})
    return kn_chapter.id


@app.delete('/delete_kn_chapter')
async def delete_kn_chapter(uid: str = Query(), chapter_id: int = Query()):
    kn_chapter = await db.knowledge_chapter.find_unique(where={'id':chapter_id}, include={'file':{'include':{'kn_class':True}}})
    if kn_chapter.file.kn_class.author_id != uid:
        return '无权访问'
    await db.knowledge_chapter.delete(where={'id': chapter_id})
# 知识树------------end



# 工作时长统计----------------
@app.get('/get_stat')
async def get_stat(uid: str = Query(), status: int = Query(1), where: str = Query('{}')):
    user = await db.user.find_unique(
        where={'id':uid},
        include={'stat':{
            'order_by':[
                {'date': 'desc'},
                {'id': 'desc'},
            ],
            'where': json.loads(where)
        }}
    )
    if not user:
        return '用户不存在'
    return {
        'choice':({
            'who': user.who_choice.split('|')[:-1],
            'type': user.type_choice.split('|')[:-1],
            'client': user.client_choice.split('|')[:-1],
            'project': user.project_choice.split('|')[:-1],
        } if status == 1 or status == 2 else None),
        'stat': (user.stat if status == 1 or status == 3 else None)
    }


@app.post('/edit_stat_choice')
async def edit_stat_choice(uid: str = Query(), key: str = Query(), type: str = Query(), value: str = Query()):
    user = await db.user.find_unique(where={'id':uid}, include={'stat':True})
    if not user:
        return '用户不存在'
    if type == 'add':
        if key == 'who':
            await db.user.update(where={'id':uid},data={'who_choice':value + '|' + user.who_choice})
        elif key == 'type':
            await db.user.update(where={'id':uid},data={'type_choice':value + '|' + user.type_choice})
        elif key == 'client':
            await db.user.update(where={'id':uid},data={'client_choice':value + '|' + user.client_choice})
        elif key == 'project':
            await db.user.update(where={'id':uid},data={'project_choice':value + '|' + user.project_choice})
    elif type == 'delete':
        if key == 'who':
            await db.user.update(where={'id':uid},data={'who_choice':user.who_choice.replace(value + '|','')})
        elif key == 'type':
            await db.user.update(where={'id':uid},data={'type_choice':user.type_choice.replace(value + '|','')})
        elif key == 'client':
            await db.user.update(where={'id':uid},data={'client_choice':user.client_choice.replace(value + '|','')})
        elif key == 'project':
            await db.user.update(where={'id':uid},data={'project_choice':user.project_choice.replace(value + '|','')})


@app.post('/add_stat')
async def add_stat(uid: str = Query(), who: str = Query(), type: str = Query(), client: str = Query(), 
                   project: str = Query(), info: str = Query(), time: float = Query(), date: str = Query()):
    user = await db.user.find_unique(where={'id':uid})
    if not user:
        return '用户不存在'
    res = await db.stat.create(data={
        'uid':uid,
        'who':who,
        'type':type,
        'client':client,
        'project':project,
        'info':info,
        'time':time,
        'date':datetime.strptime(date, "%Y-%m-%d")
    })
    return res


@app.delete('/delete_stat')
async def add_stat(uid: str = Query(), stat_id: int = Query()):
    stat = await db.stat.find_unique(where={'id':stat_id})
    if stat.uid != uid:
        return '无权访问'
    await db.stat.delete(where={'id': stat_id})
# 工作时长统计----------------end