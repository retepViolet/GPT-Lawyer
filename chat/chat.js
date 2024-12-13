const IP = '/'
const uid = getCookie('uid')
console.log(uid)
let upload_files = []
let upload_books = []
let loading = false
let knowledge_tree, message

function setCookie(name, value, minutes) {
    var expires = "";
    if (minutes) {
        var date = new Date();
        date.setTime(date.getTime() + (minutes * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=/chat";
}

function getCookie(cname){
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++){
        let c = ca[i].trim();
        if (c.indexOf(name) == 0 && name.length < c.length)
            return c.substring(name.length,c.length)
    }
    return "";
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
    document.getElementById("content").style.display = 'block'
    const loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.classList.remove('loaderbg')
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
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

function get_knowledge(){
    show_load()
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
        document.getElementById("knowledge_class").innerHTML = '<option value="null" style="color: gray" selected>--选择分类--</option>' + kn_class_html
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}

function class_seleted(){
    const kn_class = document.getElementById('knowledge_class').value 
    const kn_file = document.getElementById('knowledge_file') 
    if(kn_class == 'null'){
        kn_file.style.display = 'none'
        kn_file.value = 'null'
    }
    else{
        let html = ''
        for(file of knowledge_tree[kn_class].file)
            html += '<option value="'+file.id+'">'+file.name+'</option>'
        kn_file.innerHTML = '<option value="null" style="color: gray" selected>--请选择文件--</option>' + html
        kn_file.style.display = 'block'
    }
}

document.getElementById('fileInput').addEventListener('change', function() {
    const new_files = Array.from(this.files);
    if(upload_books.length+upload_files.length+new_files.length>5){
        showAlert('上传文件过多')
        return
    }
    let html = '', id = upload_files.length
    for (const file of new_files) {
        html += '\
            <div class="upload">\
                <img src="/static/icon/file.png">\
                <div style="max-width: 100px; overflow: hidden;">'+file.name.replace('.docx','')+'</div>\
                <div class="cancel" onclick="cancel_upload(this,true,\''+file.name+'\')">×</div>\
            </div> '
        id++
    }
    upload_list.innerHTML += html
    upload_files = upload_files.concat(new_files)
    console.log(upload_files)
    // if (file) {
    //     const formData = new FormData();
    //     formData.append('file', file);
    //     formData.append('knownledge', false);
        
    //     show_load()
    //     fetch(IP+'upload?uid='+uid, {
    //         method: 'POST',
    //         body: formData
    //     })
    //     .then(response => response.json())
    //     .then(data => {
    //         console.log('File uploaded successfully:', data);
    //         window.location.assign(IP+'file?id='+ encodeURIComponent(data.id));
    //     })
    //     .catch(error => {
    //         console.error('Error uploading file:', error);
    //         showAlert('上传失败')
    //     });
    // }
});

const upload_list = document.getElementById('upload_list')
function upload_file(){
    if(upload_books.length+upload_files.length>=5){
        showAlert('上传文件过多')
        return
    }
    document.getElementById('fileInput').click();
}

function upload_book(){
    const kn_select = document.getElementById('knowledge_file')
    if(kn_select.options[kn_select.selectedIndex].value == 'null'){
        showAlert('请选择知识库')
        return
    }
    close_window()

    const name = kn_select.options[kn_select.selectedIndex].text
    let id = upload_books.length
    upload_list.innerHTML += '\
        <div class="upload">\
            <img src="/static/icon/book.png" alt="">\
            <div style="max-width: 100px; overflow: hidden;">'+name+'</div>\
            <div class="cancel" onclick="cancel_upload(this,false,\''+name+'\')">×</div>\
        </div> '
    upload_books.push(kn_select.options[kn_select.selectedIndex].value)
    console.log(upload_books)
}

function open_window(){
    if(upload_books.length+upload_files.length>=5){
        showAlert('上传文件过多')
        return
    }
    const kn_class = document.getElementById('knowledge_class')
    const kn_file = document.getElementById('knowledge_file') 
    kn_class.value = 'null'
    kn_file.style.display = 'none'
    kn_file.value = 'null'
    document.getElementById("modal-backdrop").style.display = 'block';
}

function close_window(){
    document.getElementById("modal-backdrop").style.display = 'none';
}

function cancel_upload(element, type, name){
    if(type) for(let i=0;i<upload_files.length;i++)
        if(upload_files[i].name == name){
            upload_files.splice(i--, 1)
            break
        }
    else for(let i=0;i<upload_books.length;i++)
        if(upload_books[i].name == name){
            upload_books.splice(i--, 1)
            break
        }

    element.parentElement.parentElement.removeChild(element.parentElement)
    console.log(upload_books, upload_files)
}

function textArea_input(element){
    element.style.height = 'auto'; // 重置高度
    element.style.height = element.scrollHeight + 'px'; // 根据滚动高度设置高度
}

function textArea_keydown(event, element){
    if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        element.value += '\n'
        textArea_input(element)
    } else if (event.key === 'Enter') {
        send()
        event.preventDefault();
    }
}

function isBottom() {
    var visibleHeight = document.documentElement.clientHeight;
    var totalHeight = document.documentElement.scrollHeight;
    var scrollPosition = window.scrollY || document.documentElement.scrollTop;
    var remainingHeight = totalHeight - visibleHeight - scrollPosition;
    return (remainingHeight <= 10)
}   

function send(){
    if(loading) return
    const text_area = document.getElementById('send_text')
    const text = text_area.value
    if(text.trim()=='')return
    text_area.value = ''
    textArea_input(text_area)
    const chat_container = document.getElementById('chat-container')

    const upload_list = document.getElementById('upload_list')
    let file_html = upload_list.innerHTML
    upload_list.innerHTML = ''
    if(file_html.trim()!=''){
        for(let i=0;i<upload_books.length + upload_files.length;i++)
            file_html = file_html.replace('×','')
        file_html = '<div style="display: flex; align-items: center; height: 31px; overflow: hidden; white-space: nowrap; margin-top: 5px; user-select: none;">'+
                    file_html + '</div>'
    }

    chat_container.innerHTML += '\
        <div class="chat-message"> \
            <img src="/static/icon/user_avatar.png" class="user-avatar"> \
            <span class="chat-message-name">用户</span> \
            <div class="chat-message-content"> \
                <div class="text_content">\
                    <text>' + text + '</text>\
                    '+file_html+'\
                </div> \
            </div> \
        </div> \
        <div class="chat-message"> \
            <img src="/static/icon/favicon.png" class="user-avatar"> \
            <span class="chat-message-name">GPT Lawyer</span> \
            <div class="chat-message-content"> \
                <div class="text_content">\
                    <text id="now_chat"></text>\
                </div> \
            </div> \
        </div>'
    const now_chat = document.getElementById('now_chat')
    window.scrollTo(0, document.body.scrollHeight);

    loading = true
    message.push({
        role: 'user',
        content: text
    })
    const socket = new WebSocket("ws://localhost:8000/get_writing");
    socket.addEventListener('open', (event) => {
        socket.send(JSON.stringify({
            'uid': uid,
            'message': message,
            'file_num': upload_files.length,
            'books': upload_books
        }))
        send_files(socket)
    });

    socket.addEventListener("message", (event) => {
        if(event.data=='error') showAlert('AI 出错了，请稍后重试')
        else if(event.data=='balance') showAlert('余额不足')
        else {
            const bottom = isBottom()
            now_chat.innerText += event.data
            if(bottom) window.scrollTo(0, document.body.scrollHeight);
        }
    });

    socket.addEventListener("close", (event) => {
        loading = false
        message.push({
            role: 'assistant',
            content: now_chat.innerText
        })
        now_chat.id = 'past_chat'
        setCookie('message',message,60)
    });
}

function send_files(socket){
    const res = []
    for (let i = 0; i < upload_files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.send(event.target.result)
        };
        reader.readAsArrayBuffer(upload_files[i]);
    }
}

function main(){
    get_knowledge()
    message = decodeURIComponent(getCookie('message'))
    console.log(message)
    if(message == '')
        message = [
            {
                role:'system',
                content:'作为 GPT Laywer，一个人工智能律师助手，擅长回答用户的法律问题。'
            }
        ]
    else{
        message = JSON.parse(message)
        let html = ''
        for(text of message){
            if(text.role == 'assistant')
                html += '<div class="chat-message"> \
                            <img src="/static/icon/favicon.png" class="user-avatar"> \
                            <span class="chat-message-name">GPT Lawyer</span> \
                            <div class="chat-message-content"> \
                                <div class="text_content">\
                                    <text>'+text.content+'</text>\
                                </div> \
                            </div> \
                        </div>'
            else if(text.role == 'user')
                html += '<div class="chat-message"> \
                            <img src="/static/icon/user_avatar.png" class="user-avatar"> \
                            <span class="chat-message-name">用户</span> \
                            <div class="chat-message-content"> \
                                <div class="text_content">\
                                    <text>'+text.content+'</text>\
                                </div> \
                            </div> \
                        </div>'
        }
        document.getElementById('chat-container').innerHTML += html
    }
}

if(uid.length == 0)
    window.location.assign(IP+'login');
else main()