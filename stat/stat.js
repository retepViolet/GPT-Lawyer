const IP = '/'
let uid = getCookie('uid')
console.log(uid)
let stat_data, stat_data_show=[]

function getCookie(cname){
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name)==0 && name.length < c.length)
            return c.substring(name.length,c.length);
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
    loader.classList.remove('loaderbg')
    loader.style.display = 'none'
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
}

function quit(){
    document.cookie = "uid=1; max-age=0; path=/";
    window.location.assign(IP+'login');
}

function close_window(){
    document.getElementById("modal-backdrop").style.display = 'none';
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

function add_stat(){
    let who  = document.getElementById('who_choice').innerHTML.replace('全部','--姓名--'), 
        type = document.getElementById('type_choice').innerHTML.replace('全部','--类型--'),
        client = document.getElementById('client_choice').innerHTML.replace('全部','--客户--'), 
        project = document.getElementById('project_choice').innerHTML.replace('全部','--项目--')

    document.getElementById('modal-content').innerHTML = 
        '<span class="close-button" onclick="close_window()">×</span>\
        <select id="add_who">'+who+'</select>\
        <select id="add_type">'+type+'</select>\
        <select id="add_client">'+client+'</select>\
        <select id="add_project">'+project+'</select>\
        <select id="add_date">\
            <option value="0" selected>今天</option>\
            <option value="1">昨天</option>\
            <option value="2">前天</option>\
        </select>\
        <input id="add_time_spent" type="number" min="0" max="24" placeholder="用时（小时）">\
        <input id="add_info" type="text" placeholder="详情">\
        <button id="confirmAdd" onclick="confirm_add()">添加记录</button>'
    document.getElementById("modal-backdrop").style.display = 'block';
}

function edit_stat(){
    document.getElementById("modal-backdrop").style.display = 'block';
    document.getElementById('modal-content').innerHTML = 
        '<span class="close-button" onclick="close_window()">×</span> \
        <select onchange="edit_option_changed()" id="edit_key">\
            <option value="none" style="color: gray" selected>--选择字段--</option>\
            <option value="who">姓名</option>\
            <option value="type">类型</option>\
            <option value="client">客户</option>\
            <option value="project">项目</option>\
        </select>\
        <form style="margin-bottom: 15px;" onchange="radio_change()">\
            <input type="radio" id="option_add" name="options" value="A" checked>\
            <label for="option_add" style="font-size: small;">添加选项</label>\
            <input type="radio" id="option_delete" name="options" value="B">\
            <label for="option_delete" style="font-size: small;">删除选项</label>\
        </form>\
        <input id="add_choice" type="text"  placeholder="输入要添加的选项">\
        <select id="delete_choice" style="display: none;"><option value="none" style="color: gray;" selected>--选择要删除的选项--</option></select>\
        <button id="confirmAdd" onclick="confirm_edit()">确认添加</button>'
}

//编辑窗口中，如果选择的字段变了，选项也要变
function edit_option_changed(){
    const select1 = document.getElementById('delete_choice'), key = document.getElementById('edit_key').value
    let html = '<option value="none" style="color: gray;" selected>--选择要删除的选项--</option>'
    if(key != 'none')
        for(choice of stat_data.choice[key])
            html += '<option value="'+choice+'">'+choice+'</option>'
    select1.innerHTML = html
}

function get_date(delta){
    let date = new Date();
    date.setDate(date.getDate() - delta);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;
    let dateString = year + '-' + month + '-' + day;
    return dateString
}

function confirm_add(){
    let who = document.getElementById('add_who').value,
        type = document.getElementById('add_type').value,
        client = document.getElementById('add_client').value,
        project = document.getElementById('add_project').value,
        date = get_date(document.getElementById('add_date').value),
        time = parseFloat(document.getElementById('add_time_spent').value),
        info = document.getElementById('add_info').value
    console.log(who, type, client, project, info, date, time)
    if(!time||who=='all'||type=='all'||client=='all'||project=='all'||time==0||info.trim()==''){
        showAlert('输入有误')
        return 
    }
    close_window()
    fetch('/add_stat?uid=' + uid + '&type=' + type + '&who=' + who +
            '&client=' + client + '&project=' + project + '&date=' + date + '&time=' + time + '&info=' +info,
    {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        showAlert('添加成功')
        console.log(data)
        stat_data.stat.unshift(data)
        update_table()
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function confirm_edit(){
    let type = 'add'
    if(!document.getElementById('option_add').checked)type = 'delete'
    let key = document.getElementById('edit_key').value
    if(key == 'none'){
        showAlert('请选择一个字段')
        return
    }
    let value = ''
    if(type == 'add')value = document.getElementById('add_choice').value
    else value = document.getElementById('delete_choice').value
    if(value.trim()==''||value == 'none'){
        if(type == 'add') showAlert('请输入新的选项')
        else showAlert('请选择要删除的选项')
        return
    }

    console.log(type, key, value)
    close_window()
    fetch('/edit_stat_choice?uid=' + uid + '&type=' + type + '&key=' + key + '&value=' + value, {method: 'POST'})
    .then(response => response.json())
    .then(data => {
        update_choice()
        showAlert('编辑成功')
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  

}

function radio_change(){
    if(document.getElementById('option_add').checked){
        document.getElementById('add_choice').style.display = 'initial'
        document.getElementById('delete_choice').style.display = 'none'
        document.getElementById('confirmAdd').innerText = '确认添加'
    }
    else{
        document.getElementById('delete_choice').style.display = 'initial'
        document.getElementById('add_choice').style.display = 'none'
        document.getElementById('confirmAdd').innerText = '确认删除'
    }
}

function update_choice(){
    fetch(IP + 'get_stat?status=2&uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data)
        stat_data.choice = data.choice
        //who
        let html = '<option value="all">全部</option>'
        for(let name of data.choice.who)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('who_choice').innerHTML = html
        //type
        html = '<option value="all">全部</option>'
        for(let name of data.choice.type)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('type_choice').innerHTML = html
        //client
        html = '<option value="all">全部</option>'
        for(let name of data.choice.client)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('client_choice').innerHTML = html
        //project
        html = '<option value="all">全部</option>'
        for(let name of data.choice.project)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('project_choice').innerHTML = html
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}

function show_graph(key_name){
    let graph_data = {}, data = []
    for(let e of stat_data_show){
        if(graph_data[e[key_name]])graph_data[e[key_name]]+=e.time
        else graph_data[e[key_name]]=e.time
    }
    console.log(graph_data)
    Object.entries(graph_data).forEach(([key, value]) => {
        data.push({
            value: value.toFixed(2),
            name: key
        })
    });
    var myChart = echarts.init(document.getElementById('line'));
    var option = {
        tooltip: {
            trigger: 'item',
            
        },
        // legend: {
        //     orient: 'vertical',
        //     left: 'right',
        // },
        series: [
            {
                type: 'pie',
                radius: '80%',
                // label: { // 关闭饼图上的标签
                //     show: false
                // },
                data: data,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    myChart.setOption(option);
}

let now_element_id //被右键的列表
const menu = document.getElementById('menu')
// 添加点击事件监听，用于隐藏菜单
document.addEventListener('click', function() {
    menu.style.display = 'none';
});
menu.addEventListener('click', function() {
    menu.style.display = 'none';
    delete_stat()
});
function addEvent(){
    const rows = document.getElementById('history').querySelectorAll('tr')
    for(let row of rows){
        row.addEventListener('contextmenu', function(e) {
            now_element_id = row.id
            e.stopPropagation();
            menu.style.display = 'none';
            // 阻止默认的上下文菜单显示
            e.preventDefault();
        
            // 计算自定义菜单的位置
            var x = e.clientX;
            var y = e.clientY;
        
            // 设置自定义菜单的位置
            menu.style.display = 'block';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        });
    }
}

function delete_stat(){
    console.log('删除')
    const id = now_element_id
    fetch('/delete_stat?uid=' + uid + '&stat_id=' + stat_data.stat[id].id,
    {method: 'DELETE'})
    .then(response => response.json())
    .then(data => {
        showAlert('已删除')
        console.log(data)
        stat_data.stat.splice(id, 1)
        update_table()
    })
    .catch(error => {
        showAlert('网络错误')
        console.log(error)
    });  
}

function update_table(){
    stat_data_show = []
    let who = document.getElementById('who_choice').value,
        type = document.getElementById('type_choice').value,
        client = document.getElementById('client_choice').value,
        project = document.getElementById('project_choice').value,
        date = document.getElementById('date_choice').value,
        graph = document.getElementById('graph_choice').value

    let tot_time = 0
    const table = document.getElementById('history')
    table_html = ''
    let index_cnt = -1
    for(let e of stat_data.stat){
        index_cnt++
        if(date!='all'&& !within_days(e.date, parseInt(date)))continue
        if(who!='all'&&who!=e.who||type!=e.type&&type!='all'||client!=e.client&&client!='all'||project!=e.project&&project!='all')continue
        table_html +='<tr id="'+index_cnt+'">\
            <td>'+e.who+'</td>\
            <td>'+e.type+'</td>\
            <td>'+e.client+'</td>\
            <td> '+e.project+'</td>\
            <td>'+e.info+'</td>\
            <td>'+e.time.toFixed(2)+' h</td>\
            <td>'+e.date.substring(0, e.date.indexOf('T'))+'</td>\
        </tr>'
        tot_time += e.time
        stat_data_show.push(e)
    }
    if(table_html=='')
        table.innerHTML = '<tr><td style="text-align:cent">无工作记录</td><td></td><td></td><td></td><td></td></tr>'
    else{
        table.innerHTML = table_html
        addEvent()
    }
    show_graph(graph)
    document.getElementById('tot_time').innerText = '总用时：'+tot_time.toFixed(2)+' 小时'
}

function within_days(date, days){
    const ago = new Date();
    ago.setDate(ago.getDate() - days)
    date = new Date(date);
    return date > ago
}

function download_stat(){
    let data = [['姓名', '类型', '客户', '项目', '详情', '用时', '日期']];
    for(let a of stat_data_show){
        let buf = []
        for(let b in a)
            if(b!='uid'&&b!='user'&&b!='id')
                if(b=='date')buf.push(a[b].substring(0, a[b].indexOf('T')))
                else buf.push(a[b])
        data.push(buf)
    }
    console.log(data)
        
    // 将二维数组转换为 CSV 字符串
    function arrayToCsv(data) {
        return data.map(row => row.join(',')).join('\n');
    }
        
    // 生成 CSV 字符串
    let csvContent = "\uFEFF" + arrayToCsv(data);
        
    // 创建一个 Blob 对象，类型为 'text/csv'
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
    // 创建一个下载链接
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = '工作时长统计.csv'; // 设置下载的文件名
        
       // 模拟点击下载
    document.body.appendChild(a);
    a.click();
        
    // 清理和释放 URL 对象
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function main(){
    show_load()
    let tot_time = 0
    fetch(IP + 'get_stat'+'?uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data)

        //who
        let html = '<option value="all" selected>全部</option>'
        for(let name of data.choice.who)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('who_choice').innerHTML = html
        //type
        html = '<option value="all" selected>全部</option>'
        for(let name of data.choice.type)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('type_choice').innerHTML = html
        //client
        html = '<option value="all" selected>全部</option>'
        for(let name of data.choice.client)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('client_choice').innerHTML = html
        //project
        html = '<option value="all" selected>全部</option>'
        for(let name of data.choice.project)
            html += '<option value="'+name+'">'+name+'</option>'
        document.getElementById('project_choice').innerHTML = html

        const table = document.getElementById('history')
        table_html = ''
        stat_data = data
        let index_cnt = 0
        stat_data_show = []
        for(let e of data.stat){
            if(within_days(e.date, 7)){
                table_html +='<tr id="'+index_cnt+'">\
                    <td>'+e.who+'</td>\
                    <td>'+e.type+'</td>\
                    <td>'+e.client+'</td>\
                    <td> '+e.project+'</td>\
                    <td>'+e.info+'</td>\
                    <td>'+e.time.toFixed(2)+' h</td>\
                    <td>'+e.date.substring(0, e.date.indexOf('T'))+'</td>\
                </tr>'
                tot_time += e.time
                stat_data_show.push(e)
            }
            index_cnt++
        }
        document.getElementById('tot_time').innerText = '总用时：'+tot_time.toFixed(2)+' 小时'
        if(table_html=='')
            table.innerHTML = '<tr><td style="text-align:cent">无工作记录</td><td></td><td></td><td></td><td></td></tr>'
        else{
            table.innerHTML = table_html
            addEvent()
        }
        show_graph('type')
        hide_load()
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