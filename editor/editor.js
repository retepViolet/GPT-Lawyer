const IP = '/'
const uid = getCookie('uid')

// 获取页面参数
const queryString = window.location.search;
const params = new URLSearchParams(queryString);
const id = parseInt(params.get('id'));

function getCookie(cname)
{
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++) 
    {
        let c = ca[i].trim();
        if (c.indexOf(name)==0 && name.length < c.length) 
            return c.substring(name.length,c.length);
    }
    return "";
}

function isElementInViewport(el) {
    var rect = el.getBoundingClientRect();
    return (
      rect.top >= 10 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
}

let knowledge_tree
let suggestions = []
let deleted = []
let now_words = null
let now_id = -1
function words_click(id){
    s = suggestions[id]
    const words = document.getElementById(s.citation);

    if(now_id==id) return
    words.classList.toggle("highlighted");
    if(now_words!=null) now_words.classList.remove("highlighted")
    const index = words.innerHTML.indexOf(' <mark>')
    if(index!=-1)
        document.getElementById("suggestion_mistake").innerHTML = words.innerHTML.substring(0,index)
    else document.getElementById("suggestion_mistake").innerHTML = words.innerText
    document.getElementById("suggestion_correct").innerHTML = s.annotation
    document.getElementById("suggestion_knowledge").innerHTML = s.knowledge

    if(!isElementInViewport(words)){
        window.scrollTo({
            top: window.scrollY + words.getClientRects()[0].top - document.documentElement.clientTop - 300,
            behavior: 'smooth' // or 'auto' for the default behavior
        });
    }

    now_id = id
    now_words = words
    const delta = s.knowledge==''?15:25
    const height = Math.min(document.getElementById('suggestion_mistake').scrollHeight,101.4)
                    + document.getElementById('suggestion_correct').scrollHeight 
                    + document.getElementById('suggestion_knowledge').scrollHeight 
                    + delta;
    document.getElementById('move').style.height = height + 'px'
}

function next_one(){
    if(now_id + 1 < suggestions.length)
        words_click(now_id+1)
    else words_click(0)
}

function last_one(){
    if(now_id - 1 >= 0)
        words_click(now_id-1)
    else words_click(suggestions.length-1)
}

function edit_suggestion(id, status){
    let queryString = '&id='+id+'&status='+status
    fetch(IP + 'edit_suggestion?uid=' + uid + queryString, {method: 'POST'})
    .then(response => response.json())
    .then(data => {console.log(data)})
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function accept(){
    s = suggestions[now_id]
    deleted[suggestions[now_id].id] = true
    const txt = document.getElementById(s.citation)
    if(txt.innerHTML.indexOf('  <mark>')==-1)
        txt.innerHTML += '  <mark>' + suggestions[now_id].annotation + '</mark>'
    txt.removeAttribute("onclick")
    txt.classList.remove('wrong');
    edit_suggestion(suggestions[now_id].id, 1)
}

function dismiss(){
    s = suggestions[now_id]
    deleted[suggestions[now_id].id] = true
    const txt = document.getElementById(s.citation)
    index = txt.innerHTML.indexOf(" <mark>")
    if(index != -1)
        txt.innerHTML = txt.innerHTML.substring(0,index)
    txt.removeAttribute("onclick")
    txt.classList.remove('wrong');
    edit_suggestion(suggestions[now_id].id, -1)
}

// 获取批注
function ask_AI(){
    show_progress()
    const request = document.getElementById('request').value;
    const book_id = document.getElementById('knowledge').value
    console.log(book_id)

    const socket = new WebSocket("ws://localhost:8000/get_suggestions");
    socket.addEventListener('open', (event) => {
        socket.send(JSON.stringify({
            'id': id,
            'uid': uid,
            'request': request,
            'knowledge_id': book_id
        }))
    });

    socket.addEventListener("message", (event) => {
        if(event.data=='error') showAlert('AI 出错了，请稍后重试')
        else if(event.data=='balance') showAlert('余额不足')
        else {
            // 更新进度显示
            unit = parseInt(event.data)
            console.log(event.data)
            update_progress(unit)
        }
    });

    socket.addEventListener("close", (event) => {
        document.getElementById("progress_bar").style.transitionDuration = '1s'
        update_progress(100)
        setTimeout(() => {
            hide_progress()
            main()
        }, 1500);
    });
}

function writing_AI(){
    const editor = document.getElementById('editor')
    const request = document.getElementById('request').value;
    const book_id = document.getElementById('knowledge').value

    const socket = new WebSocket("ws://localhost:8000/get_writing");
    socket.addEventListener('open', (event) => {
        socket.send(JSON.stringify({
            'id': id,
            'uid': uid,
            'request': request,
            'knowledge_id': book_id
        }))
        document.getElementById("suggestion").innerHTML = 
            '<p id="suggestion_mistake">文件：'+document.getElementById("title_input").value+'</p> \
            <p id="suggestion_correct"> AI 正在生成... </p>'
    });

    socket.addEventListener("message", (event) => {
        if(event.data=='error') showAlert('AI 出错了，请稍后重试')
        else if(event.data=='balance') showAlert('余额不足')
        else editor.innerHTML += event.data
    });

    socket.addEventListener("close", (event) => {
        document.getElementById("suggestion").innerHTML = 
            '<p id="suggestion_mistake">文件：'+document.getElementById("title_input").value+'</p> \
            <p id="suggestion_correct"> AI 生成完毕，可下载成 word 文档后本地编辑。 </p>'
    });
}

function show_load(){
    document.getElementById("content").style.display = 'none'
    const loader = document.getElementById("loaderbg")
    loader.classList.add('loaderbg')
    loader.style.display = 'block'
    setTimeout(function() {
        loader.innerHTML = 
        '<div class="spinner">\
            <div class="double rect1"></div>\
            <div class="double rect2"></div>\
            <div class="double rect3"></div>\
            <div class="double rect4"></div>\
            <div class="double rect5"></div>\
        </div>'
    }, 500);
}

function hide_load(){
    document.getElementById("content").style.display = 'flex'
    const loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.classList.remove('loaderbg')
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
}

function show_progress(){
    loader = document.getElementById("loaderbg")
    loader.style.display = 'block'
    loader.innerHTML = 
    '<div class="progress_bar_background">\
        <div id="progress_container">\
            <div id="progress_bar">批注中</div>\
            \
        </div>\
    </div>'
    loader.classList.add('loaderbg')
    loader.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
    loader.style.backdropFilter  = "blur(1px)"
}

function update_progress(percentage){
    loader = document.getElementById("progress_bar")
    loader.style.width = percentage+'%'
}

function hide_progress(){
    loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.innerHTML = ''
    loader.classList.remove('loaderbg')
    loader.style.backgroundColor = "white";
    loader.style.backdropFilter  = "blur(0px)"
}

function restart(){
    save_file()
    document.getElementById("suggestion").innerHTML = 
            '<select id="knowledge"><option value="null" selected>选择知识库来指导 AI </option></select>\
            <textarea placeholder="告诉 AI 你的需求，例如：“找出错别字和语法错误”、“站在甲方立场修改合同”、“标注出企业信息”。" id="request"></textarea>\
            <button class="start" onclick="ask_AI()"> 开始批注 </button>'
    get_knowledge()
}

document.getElementById('title').addEventListener('keydown',function(e){
    e.stopPropagation()
}, false)

window.addEventListener("keydown", function(e) {
    if(document.activeElement == document.getElementById('title'))return
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault()
            accept()
            break;
        case 'ArrowDown':
            e.preventDefault()
            dismiss()
            break;
        case 'ArrowLeft':
            last_one()
            break;
        case 'ArrowRight':
            next_one()
            break;
    }
}, false);

// window.addEventListener('beforeunload', function (event) {
//     event.preventDefault()
//     return
// });

function save_title(){
    let file_name = document.getElementById('title_input').value
    if(file_name=='')file_name='未命名'

    fetch(IP + 'save_title?id='+id+'&uid='+uid+'&title=' + encodeURIComponent(file_name),{
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {})
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function get_knowledge(){
    const params = new URLSearchParams();
    params.append('uid', uid);
    fetch(IP + 'get_knowledge?'+params.toString())
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // 处理返回的数据
        console.log(data)
        knowledge_tree = data
        hide_load()
        let kn_class_html = '', cnt = 0
        for(kn_class of data){
            kn_class_html += '<option value="'+cnt+'">'+kn_class.name+'</option>'
            cnt++
        };
        document.getElementById("knowledge_class").innerHTML = '<option value="null" style="color: gray" selected>--选择知识库分类--</option>' + kn_class_html
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}

function class_seleted(){
    const kn_class = document.getElementById('knowledge_class').value 
    const kn_file = document.getElementById('knowledge') 
    if(kn_class == 'null'){
        kn_file.style.display = 'none'
        kn_file.value = 'null'
    }
    else{
        let html = ''
        for(file of knowledge_tree[kn_class].file)
            html += '<option value="'+file.id+'">'+file.name+'</option>'
        kn_file.innerHTML = '<option value="null" style="color: gray" selected>--选择知识库-- </option>' + html
        kn_file.style.display = 'block'
    }
}

function showAlert(message) {
    const alertBox = document.getElementById('alert-box');
    if(alertBox.innerText!='')return
    alertBox.innerText = message
    alertBox.style.transform = 'translateX(-50%) translateY(0%)'; // 滑入屏幕
    setTimeout(function() {
        alertBox.style.transform = 'translateX(-50%) translateY(-110%)'; // 滑出屏幕
    }, 1500); // 5秒后滑出
    setTimeout(function() {
      alertBox.innerText = ''
    }, 2000);
}

function main(){
    suggestions = []
    deleted = []
    now_words = null
    now_id = -1

    show_load()
    fetch(IP+'get_file?id='+id+'&uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("suggestion").style.display = 'block'
        document.getElementById("editor").innerHTML = data.content
        document.getElementById("title").innerHTML = '<input id="title_input" value="'+data.name+'" onchange="save_title()">'
        suggestions = data.suggestions
        if(data.summarization==''){
            document.getElementById("suggestion").innerHTML = 
            '<select id="knowledge_class" onchange="class_seleted()"><option value="null" style="color: gray" selected>--选择知识库分类--</option></select>\
            <select id="knowledge"><option value="null" style="color: gray" selected>--选择知识库-- </option></select>\
            <textarea placeholder="告诉 AI 你的需求，例如：“找出错别字和语法错误”、“站在甲方立场修改合同”、“标注出企业信息”。" id="request"></textarea>\
            <button class="start" onclick="ask_AI()"> 开始批注 </button>'
            get_knowledge()
        }
        else if(suggestions.length>0){
            document.getElementById("suggestion").innerHTML = 
            '<div id="move">\
            <p id="suggestion_mistake"></p>\
            <p id="suggestion_correct"></p>\
            <p id="suggestion_knowledge"></p>\
            </div>\
            <div class="buttons">\
                <div class="left-buttons">\
                    <button class="accept" onclick="accept()">接受</button>\
                    <button class="dismiss" onclick="dismiss()">忽略</button>\
                </div>\
                <div class="right-buttons">\
                    <button class="next_last" onclick="last_one()"> < </button>\
                    <button class="next_last" onclick="next_one()"> > </button>\
                </div>\
            </div>'
            console.log(suggestions)
            suggestions.forEach(function(s,i){
                if(s.status==0){
                    p = document.getElementById(s.citation)
                    if(p != null){
                        p.onclick = function(){words_click(i)}
                        p.className = 'wrong'
                    }
                }
                else if(s.status==1){
                    p = document.getElementById(s.citation)
                    if(p != null){
                        p.innerHTML += '  <mark>' + s.annotation + '</mark>'
                        p.onclick = function(){words_click(i)}
                    }
                }
                else if(s.status==-1){
                    p = document.getElementById(s.citation)
                    if(p != null)
                        p.onclick = function(){words_click(i)}
                }
            });
            hide_load()
            words_click(0)
        }
        // else{
        //     document.getElementById("suggestion").innerHTML = 
        //     '<p id="suggestion_mistake">文件：'+document.getElementById("title_input").value+'</p> \
        //     <p id="suggestion_correct"> 没有剩余的修改建议</p>'
        //     hide_load()
        // }
    })
    .catch(error => {
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}
if(uid.length == 0)
    window.location.assign(IP+'login');
else main()