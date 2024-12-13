const IP = '/'
let uid = getCookie('uid')
console.log(uid)
let files2 = []

function getCookie(cname)
{
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++) 
    {
        let c = ca[i].trim();
        if (c.indexOf(name)==0 && name.length < c.length)
            return decodeURIComponent(c.substring(name.length,c.length));
    }
    return "";
}

function show_load(){
    // document.getElementById("search").style.display = 'none'
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
    // document.getElementById("search").style.display = 'flex'
    document.getElementById("content").style.display = 'block'
    const loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.classList.remove('loaderbg')
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
}

function search(){
    input = document.getElementById('searchBox').value
    found = []
    files2.forEach(file => {
        if(file.name.indexOf(input)!=-1)
            found.push(file)
    });
    page_update(found)
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

//知识库后端--------------

function new_class(class_name){
    fetch('/new_kn_class?uid='+uid+'&class_name='+encodeURIComponent(class_name), {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        console.log('新建分类：',data)
        const index = document.getElementById('index')
        index.innerHTML += 
        '<div class="folder_border"> \
            <div onclick="toggleFolder(this)" class="folder" id="c'+data+'">\
                <img src="/static/icon/folder_close.png" >' + class_name + '\
            </div>\
        </div>'
        addEvent()
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });      
}

function new_file(file_name){
    const class_id = now_element.id.substring(1)
    fetch('/new_kn_file?uid='+uid+'&file_name='+encodeURIComponent(file_name)+'&class_id='+class_id, {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        console.log('新建文件：',data)
        let open = ''
        if(now_element.innerHTML.indexOf('rotate_img')!=-1)open = 'open'
        now_element.parentElement.innerHTML += ' \
            <div class="file_border ' + open + '"> \
                <div class="file" onclick="toggleFile(this)" id="f'+data+'"> \
                    <img src="/static/icon/book_close.png">' + file_name + ' \
                </div> \
            </div>'
        addEvent()
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function new_chapter(chapter_name, file_id){
    fetch('/new_kn_chapter?uid='+uid+'&chapter_name='+encodeURIComponent(chapter_name)+'&file_id='+file_id, {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        console.log('新建章节：',data)
        let open = ''
        if(now_element.innerHTML.indexOf('book_open')!=-1)open = 'open'
        now_element.parentElement.innerHTML += 
        '<div class="chapter '+open+'" id="h'+data+'" onclick="toggleChapter(this)"> <img src="/static/icon/chapter.png">' + chapter_name + '</div>'
        
        if(now_file=='f'+file_id){
            const new_chapter = document.getElementById('add-button')
            new_chapter.id = 'ch' + data
            new_chapter.onclick = ''
            new_chapter.innerHTML = 
            '<div class="editor" id="ch'+data+'"> \
                <input value="'+ chapter_name +'" onchange="save_chapter('+data+',\'title\', this)" placeholder="请输入标题..."> \
                <textarea onchange="save_chapter('+data+',\'content\', this)" oninput="chapter_input(this)" placeholder="请输入内容..."></textarea> \
            </div>\
            <div></div> ' 

            const file_content = document.getElementById('file_content')
            const button = document.createElement('div');
            button.id = 'add-button'
            button.innerHTML = '<button onclick="add_chapter()">+</button>'
            file_content.appendChild(button)
            
            file_content.scrollTo({
                top:  file_content.scrollTop + new_chapter.getClientRects()[0].top - 100,
                behavior: 'smooth' // or 'auto' for the default behavior
            });
        }
        addEvent()
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function delete_kn(id, type){
    id = id.substring(1)
    let url = ''
    if(type == 'class') url = '/delete_kn_class?uid='+uid+'&class_id='+id
    else if(type == 'file') url = '/delete_kn_file?uid='+uid+'&file_id='+id
    else url = '/delete_kn_chapter?uid='+uid+'&chapter_id='+id
    fetch(url, {method: 'DELETE'})
    .then(response => response.json())
    .then(data => {
        console.log('成功删除元素')
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });      
}

function rename_kn(id, new_name, type){
    id = id.substring(1)
    let url = '/rename_kn?uid='+uid+'&type='+type+'&id='+id+'&new_name='+encodeURIComponent(new_name)
    fetch(url, {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        console.log('成功重命名元素')
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function save_title(){
    if(now_file=='')return
    let title = document.getElementById('title').value
    const fileElement = document.getElementById(now_file)
    title = title.trim()
    if(title == ''){
        title = '未命名'
        document.getElementById('title').value = title
    }
    rename_kn(now_file, title, 'file')

    let src = '/static/icon/book_close.png'
    if(fileElement.innerHTML.indexOf('book_open') >= 0)
        src = '/static/icon/book_open.png'
    fileElement.innerHTML = '<img src=' + src +'>' + title
}

function save_chapter(id, type, chapterElement){
    const content = chapterElement.value
    fetch('/save_kn_chapter?uid='+uid+'&chapter_id='+id+'&type='+type+'&content='+encodeURIComponent(content),
        {method:'POST'})
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('保存章节',type)
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });

    if(type=='title'){
        document.getElementById('h'+id).innerHTML = '<img src="/static/icon/chapter.png">' + content
    }
}

//知识库后端--------------结束
 

//知识库前端--------------
let now_event = '', now_element, now_file = ''
const folderMenu = document.getElementById('folder-menu'); 
const fileMenu = document.getElementById('file-menu');
const chapterMenu = document.getElementById('chapter-menu');
const divMenu = document.getElementById('index-menu');

folderMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    const event = e.target.textContent
    if(event == '删除分类'){
        if(now_file!=''&&now_element.parentElement.querySelector('#'+now_file)){
            document.getElementById('file_content').innerHTML = '<img src="/static/icon/books.png" id = "books_image">'
            document.getElementById('title').value = '在右侧目录中选择文件'
            now_file = ''
        }
        now_element.parentElement.parentElement.removeChild(now_element.parentElement)
        delete_kn(now_element.id, 'class')
    }
    else if(event == '重命名'){
        open_window('rename folder', '请输入新的分类名：', now_element.innerText)
    }
    else if(event == '新建文件'){
        open_window('new file', '请输入文件名：', '')
    }
});
fileMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    const event = e.target.textContent
    if(event == '删除文件'){
        if(now_file!=''&&now_element.id == now_file){
            document.getElementById('file_content').innerHTML = '<img src="/static/icon/books.png" id = "books_image">'
            document.getElementById('title').value = '在右侧目录中选择文件'
            now_file = '' 
        }
        now_element.parentElement.parentElement.removeChild(now_element.parentElement)
        delete_kn(now_element.id, 'file')
    }
    else if(event == '重命名'){
        open_window('rename file', '请输入新的文件名：', now_element.innerText)
    }
    else if(event == '新建章节'){
        open_window('new chapter', '请输入章节名：', '')
    }
});
chapterMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    const event = e.target.textContent
    if(event == '删除章节'){
        if(now_file!=''&&now_element.parentElement.querySelector('#'+now_file)){
            const file_content = document.getElementById('file_content')
            const chapter = document.getElementById('c'+now_element.id)
            file_content.removeChild(chapter)
        }
        now_element.parentElement.removeChild(now_element)
        delete_kn(now_element.id, 'chapter')
    }
    else if(event == '重命名'){
        open_window('rename chapter', '请输入新的章节名：', now_element.innerText)
    }
});
divMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    open_window('new class', '请输入分类名：', '')
});

function toggleFolder(folderElement) {
    let files = folderElement.parentElement.querySelectorAll('.file_border');
    for (let file of files)
      file.classList.toggle('open');
    folderElement.querySelectorAll('img')[0].classList.toggle('rotate_img');
}

function toggleFile(fileElement) {
    let files = fileElement.parentElement.querySelectorAll('.chapter');
    for (let file of files)
      file.classList.toggle('open');
    const img = fileElement.querySelectorAll('img')[0]
    if(img.src.indexOf('close.png')>0){
        img.src = "/static/icon/book_open.png"
        open_file(fileElement.id, '')
    }
    else img.src = "/static/icon/book_close.png"
    img.classList.toggle('open_img')
}

function toggleChapter(chapterElement){
    const fileElement = chapterElement.parentElement.querySelectorAll('.file')[0]
    open_file(fileElement.id, 'c'+chapterElement.id)
}

function add_chapter(){  //文件中的按钮
    open_window('new chapter in file', '请输入章节名：', '')
}

function confirm(){
    const text = document.getElementById('input-txt').value.trim()
    if(text==''){
        showAlert('不能为空')
        return
    }
    console.log(text)
    if(now_event == 'new class') new_class(text)
    else if(now_event == 'rename folder'){
        rename_kn(now_element.id,text,'class')
        let img_class = ''
        if(now_element.innerHTML.indexOf('rotate_img') >= 0)
            img_class = 'class="rotate_img"'
        now_element.innerHTML = '<img src="/static/icon/folder_close.png"' + img_class + '>' + text
    } 
    else if(now_event == 'rename file'){
        rename_kn(now_element.id,text,'file')
        let src = '/static/icon/book_close.png'
        if(now_element.innerHTML.indexOf('book_open') >= 0)
            src = '/static/icon/book_open.png'
        now_element.innerHTML = '<img src=' + src +'>' + text
        if(now_element.id==now_file)document.getElementById('title').value = text
    }
    else if(now_event == 'rename chapter'){
        rename_kn(now_element.id,text,'chapter')
        now_element.innerHTML = '<img src="/static/icon/chapter.png">' + text
        if(now_element.parentElement.querySelector('.file').id==now_file)
            document.getElementById('c'+now_element.id).querySelector('input').value = text
    }
    else if(now_event == 'new chapter') new_chapter(text, now_element.id.substring(1))
    else if(now_event == 'new chapter in file'){
        now_element = document.getElementById(now_file)
        new_chapter(text, now_file.substring(1))
    }
    else if(now_event == 'new file') new_file(text)
    close_window()
}

function open_window(event, info, input_value){
    now_event = event
    const input_element = document.getElementById('input-txt')
    input_element.value = input_value
    document.getElementById('info-txt').innerText = info
    document.getElementById("modal-backdrop").style.display = 'block';
    input_element.select()
}

function close_window(){
    document.getElementById("modal-backdrop").style.display = 'none';
}

// 添加点击事件监听，用于隐藏菜单
document.addEventListener('click', function() {
    fileMenu.style.display = 'none';
    folderMenu.style.display = 'none';
    chapterMenu.style.display = 'none';
    divMenu.style.display = 'none';
});
folderMenu.addEventListener('click', function() {
    folderMenu.style.display = 'none';
});
fileMenu.addEventListener('click', function() {
    fileMenu.style.display = 'none';
});
chapterMenu.addEventListener('click', function() {
    chapterMenu.style.display = 'none';
});
divMenu.addEventListener('click', function() {
    divMenu.style.display = 'none';
});
function addEvent(){
    const folders = document.querySelectorAll('.folder')
    const files = document.querySelectorAll('.file')
    const chapters = document.querySelectorAll('.chapter')
    const index = document.getElementById('index')
    for(let folder of folders){
           // 添加右键点击事件监听
        folder.addEventListener('contextmenu', function(e) {
            now_element = folder
            e.stopPropagation();
            fileMenu.style.display = 'none';
            chapterMenu.style.display = 'none';
            divMenu.style.display = 'none';
            // 阻止默认的上下文菜单显示
            e.preventDefault();
        
            // 计算自定义菜单的位置
            var x = e.clientX;
            var y = e.clientY;
        
            // 设置自定义菜单的位置
            folderMenu.style.display = 'block';
            folderMenu.style.left = x + 'px';
            folderMenu.style.top = y + 'px';
        });
    }
    for(let file of files){
           // 添加右键点击事件监听
        file.addEventListener('contextmenu', function(e) {
            now_element = file
            e.stopPropagation();
            folderMenu.style.display = 'none';
            chapterMenu.style.display = 'none';
            divMenu.style.display = 'none';
            // 阻止默认的上下文菜单显示
            e.preventDefault();
        
            // 计算自定义菜单的位置
            var x = e.pageX;
            var y = e.pageY;
        
            // 设置自定义菜单的位置
            fileMenu.style.display = 'block';
            fileMenu.style.left = x + 'px';
            fileMenu.style.top = y + 'px';
        
            // 添加点击事件监听，用于隐藏菜单
        });
    }
    for(let chapter of chapters){
        // 添加右键点击事件监听
        chapter.addEventListener('contextmenu', function(e) {
            now_element = chapter
            e.stopPropagation();
            folderMenu.style.display = 'none';
            fileMenu.style.display = 'none';
            divMenu.style.display = 'none';
            // 阻止默认的上下文菜单显示
            e.preventDefault();
        
            // 计算自定义菜单的位置
            var x = e.pageX;
            var y = e.pageY;
        
            // 设置自定义菜单的位置
            chapterMenu.style.display = 'block';
            chapterMenu.style.left = x + 'px';
            chapterMenu.style.top = y + 'px';
        
            // 添加点击事件监听，用于隐藏菜单
        });
    }
    index.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
        e.preventDefault();
        folderMenu.style.display = 'none';
        fileMenu.style.display = 'none';
        chapterMenu.style.display = 'none';
        // 计算自定义菜单的位置
        var x = e.pageX;
        var y = e.pageY;
    
        // 设置自定义菜单的位置
        divMenu.style.display = 'block';
        divMenu.style.left = x + 'px';
        divMenu.style.top = y + 'px';
    
        // 添加点击事件监听，用于隐藏菜单

    })
}

// window.addEventListener('beforeunload', function (event) {
//     // event.preventDefault()
//     const value = document.getElementById('index').innerHTML
//     document.cookie = 'index_html =' + encodeURIComponent(value).length + "; path=/knowledge";
// });

function update_index(knowledge){
    const index = document.getElementById('index')
    let html = ''
    for (const kn_class of knowledge) {
        html += 
        '<div class="folder_border"> \
            <div onclick="toggleFolder(this)" class="folder" id="c'+kn_class.id+'"> \
                <img src="/static/icon/folder_close.png">'+ kn_class.name +' \
            </div>'
        for (const file of kn_class.file){
            html += 
            '<div class="file_border"> \
                <div class="file" onclick="toggleFile(this)" id="f'+file.id+'"> \
                    <img src="/static/icon/book_close.png">'+ file.name +' \
                </div>'
            for (const chapter of file.chapter){
                html += 
                '<div class="chapter" id="h'+chapter.id+'" onclick="toggleChapter(this)"> \
                    <img src="/static/icon/chapter.png">'+ chapter.name +' \
                </div>'
            }
            html += '</div>'
        }
        html += '</div>'
    }
    index.innerHTML = html
    addEvent()
}

function open_file(file_id, chapter_id){
    const file_content = document.getElementById('file_content')
    if(now_file == file_id){
        if(chapter_id!=''){
            const chapter = document.getElementById(chapter_id)
            file_content.scrollTo({
                top:  file_content.scrollTop + chapter.getClientRects()[0].top - 100,
                behavior: 'smooth' // or 'auto' for the default behavior
            });
        }
        return
    }

    now_file = file_id
    fetch('/get_kn_file?uid='+uid+'&file_id='+file_id.substring(1))
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        let html = '<div style="height: 15vh;"></div>'
        document.getElementById('title').value = data.name
        for(chapter of data.chapter){
            html += 
            '<div class="editor" id="ch'+chapter.id+'" > \
                <input value="'+chapter.name+'" onchange="save_chapter('+chapter.id+',\'title\', this)" placeholder="请输入标题..."> \
                <textarea onchange="save_chapter('+chapter.id+',\'content\', this)" oninput="chapter_input(this)" placeholder="请输入内容...">'+chapter.content+'</textarea> \
            </div>'
        }
        html += 
        '<div></div>\
        <div id="add-button">\
            <button onclick="add_chapter()">+</button>\
        </div>'
        file_content.innerHTML = html

        if(chapter_id!=''){
            const chapter = document.getElementById(chapter_id)
            console.log(file_content.scrollY + chapter.getClientRects()[0].top)
            file_content.scrollTo({
                top:  file_content.scrollTop + chapter.getClientRects()[0].top - 100,
                behavior: 'smooth' // or 'auto' for the default behavior
            });
        }
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}

let text_buf = ''
function chapter_input(element){ //限制字数
    const text = element.value;
    const count = text.length;
    if (count >= 500){
        if(text_buf=='')text_buf = text.slice(0,500)
        element.value = text_buf
        showAlert('字数限制 300 字')
    }
    else text_buf = ''
}
//知识库前端--------------结束

function main(){
    show_load()
    fetch('/get_knowledge?uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('知识库：',data)
        update_index(data)
        hide_load()
        console.log(document.getElementById('content').innerHTML.length)
    })
    .catch(error => {
            // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}
if(uid.length == 0)
    window.location.assign(IP+'login');
else main()