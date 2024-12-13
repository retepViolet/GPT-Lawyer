const IP = '/'
let uid = getCookie('uid')
console.log(uid)

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

function pay(){
    document.getElementById("modal-backdrop").style.display = 'block';
}

function close_pay(){
    document.getElementById("modal-backdrop").style.display = 'none';
}

function submit_pay(){
    show_load()
    const fee = document.getElementById('amount').value
    fetch(IP + 'pay'+'?uid='+uid+'&fee='+ fee, {method:'POST'})
    .then(response => {
        if (!response.ok) {
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data)
        close_pay()
        showAlert('支付成功')
        main()
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
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

// 定义一个函数，用于获取今天前七天的日期数组
function getPreviousSevenDays() {
    const today = new Date();
    const dates = [];
  
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate()-i);
        date.setHours(date.getHours()+8)
        dates.push(date.toISOString().split('T')[0]); // 获取年-月-日
    }
    console.log(dates)
    return dates;
}
  
 // 定义一个函数，用于解析时间和计算总花费
function calculateTotalCost(records) {
    let costsByDate = [0,0,0,0,0,0,0]
    const previousSevenDays = getPreviousSevenDays();

    // 解析记录，并累加同一天的cost
    records.forEach((record) => {
        const cost = record.cost, time = record.time
        const recordDate = new Date(time).toISOString().split('T')[0]; // 获取记录的年-月-日
  
        // 只考虑包括今天的前7天
        const index = previousSevenDays.indexOf(recordDate)
        if (index!=-1) costsByDate[index] += cost;
    });
    
    for(let i=0; i<7; i++)
        costsByDate[i] = Number(costsByDate[i].toFixed(2))
    return costsByDate;
}

function show_graph(costs){
    var line = echarts.init(document.getElementById('line'));
        // 指定图表的配置项和数据
    lineOption = {
        // 标题
        // title: {text: 'echarts实现折线图'},
        // 图例
        color: '#9f37d3',
        tooltip: {
            show: true,
            trigger: "axis",
            backgroundColor: "white",
            // {a}（系列名称），{b}（类目值），{c}（数值）, {d}（无）
            formatter: "消费 {c} 元"
        },
        grid: {
            left: '0%',
            right: '5%',
            bottom: '3%',
            top: '9%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['六天前', '五天前', '四天前', '三天前', '前天', '昨天', '今天']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '价格',
            data: costs,
            type: 'line'
        }]
    };
    line.setOption(lineOption);
    window.onresize = function() {
        line.resize();
    };
}

function main(){
    show_load()
    fetch(IP + 'get_user'+'?uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // 处理返回的数据
        document.getElementById('username').innerText = data.username
        const c = '•'
        let buf = ''
        for(let i=0; i < data.password.length; i++)
            buf += c
        document.getElementById('password').innerText = buf
        document.getElementById('balance').innerText = data.balance.toFixed(2) + ' 元'
        document.getElementById('email').innerText = data.phone

        const table = document.getElementById('history')
        table_html = ''
        data.history.forEach(e => {
            if(e.model=='问答')return
            table_html +='<tr>\
                <td>'+e.file_name+'</td>\
                <td>'+e.model+'</td>\
                <td>'+e.token+'</td>\
                <td>¥ '+e.cost.toFixed(4)+'</td>\
                <td>'+e.time+'</td>\
            </tr>'
        });
        if(table_html=='')
            table_html = '<tr><td style="text-align:cent">无调用历史</td><td></td><td></td><td></td><td></td></tr>'
        table.innerHTML = table_html

        document.getElementById('content').style.display = 'block'
        show_graph(calculateTotalCost(data.history))
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