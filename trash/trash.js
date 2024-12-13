const IP = '/'
const uid = getCookie('uid')

function getCookie(cname)
{
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) 
  {
    var c = ca[i].trim();
    if (c.indexOf(name)==0 && name.length < c.length) 
        return c.substring(name.length,c.length);
  }
  return "";
}

function page_update(files){
    // 获取文件容器
    const fileContainer = document.getElementById('content');
    fileContainer.innerHTML = '\
    <div id="info">\
        <img src="/static/icon/warning.png">\
        <div id="warning">回收站中的文件将在 30 天后永久删除。</div>\
        <div id="empty_trash" onclick="clear_trash()">清空回收站</div>\
    </div>'

    // 动态生成文件显示块并添加到文件容器
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file';

        const passageElement = document.createElement('div');
        passageElement.className = 'passage';

        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = file.name;

        const textElement = document.createElement('div');
        textElement.className = 'text';
        textElement.innerHTML = file.content;

        passageElement.appendChild(titleElement);
        passageElement.appendChild(textElement);

        passageElement.onclick = function() {
            open_file(file.id);
        };

        const bottomElement = document.createElement('div');
        bottomElement.className = 'bottom';

        const numElement = document.createElement('text');
        numElement.className = 'num'
        numElement.innerText = file.num == 0 ? '': Math.min(file.num, 99)

        const downloadElement = document.createElement('img');
        downloadElement.src = '/static/icon/restore.png';
        downloadElement.onclick = function() {
            restore_file(file.id, fileElement);
        };

        const trashElement = document.createElement('img');
        trashElement.src = '/static/icon/trash_light.png';
        trashElement.onclick = function() {
            delete_file(file.id, fileElement);
        };

        bottomElement.appendChild(numElement);
        bottomElement.appendChild(downloadElement);
        bottomElement.appendChild(trashElement);

        fileElement.appendChild(passageElement);
        fileElement.appendChild(bottomElement);

        fileContainer.appendChild(fileElement);
    });
}

function restore_file(id, element){
    fetch(IP+'restore?id='+id+'&uid='+uid, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                showAlert('“'+data.name+'” 已还原')
                // main()
                element.parentElement.removeChild(element)
            })
            .catch(error => {
                showAlert('网络错误')
                console.error('Error uploading file:', error);
            });
}

function delete_file(id, element){
    fetch(IP+'real_delete_file?id='+id+'&uid='+uid, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                console.log('File delete successfully:', data);
                // main()
                element.parentElement.removeChild(element)
                showAlert('“'+data.name+'” 已被永久删除')
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                showAlert('网络错误')
            });
}

function show_load(){
    document.getElementById("search").style.display = 'none'
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
    document.getElementById("search").style.display = 'flex'
    document.getElementById("content").style.display = 'block'
    const loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.classList.remove('loaderbg')
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
}

function clear_trash(){
    console.log('clear trash')
    show_load()
    files_id = []
    files2.forEach(file => {files_id.push(file.id)});
    const queryString = files_id.map(item => `id=${item}`).join('&');
    console.log(queryString)
    fetch(IP+'real_delete_file?'+queryString+'&uid='+uid, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        console.log('File delete successfully:', data);
        showAlert('回收站已清空')
        main()
    })
    .catch(error => {
        showAlert('网络错误')
        console.error('Error uploading file:', error);
    });
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

function main(){
    show_load()
    fetch(IP + 'get_all_file'+'?uid='+uid+'&delete=true')
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
        files2 = data
        if(data.length==0){
            const div = document.getElementById("empty")
            div.classList.add('loaderbg')
            div.innerHTML = 
            '<img src="/static/icon/empty_trash.png">'
            div.style.display = 'flex'
            hide_load() //必须在下面那行的前面
            document.getElementById('search').style.display = "none"
            document.getElementById('content').style.display = "none"
        }
        else{
            page_update(data)
            hide_load() //必须在下面那行的前面
            document.getElementById('search').style.display = "flex"
        }
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