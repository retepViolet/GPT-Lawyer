fetch('/console0328_data')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        // 处理返回的数据
        console.log(data)
        let table = document.getElementById('users')
        data.users.forEach(user => {
            table.innerHTML += '<tr><td>'+user.id+'</td>'+'<td>'+user.username+'</td>'+'<td>'+user.phone+'</td>'+'<td>'+user.password+'</td>'+'<td>'+user.balance+'</td></tr>'
        });

        table = document.getElementById('files')
        data.files.forEach(file => {
            table.innerHTML += '<tr><td>'+file.id+'</td>'+'<td>'+file.name+'</td>'+'<td>'+file.author_id+'</td>'+'<td>'+(file.knowledge?'知识':(file.write?'问答':'批注'))+'</td>'+'<td>'+file.summarization.substr(0,50)+'</td></tr>'
        });

        table = document.getElementById('history')
        data.history.forEach(h => {
            table.innerHTML += '<tr><td>'+h.id+'</td>'+'<td>'+h.uid+'</td>'+'<td>'+h.file_name+'</td>'+'<td>'+h.model+'</td>'+'<td>'+h.cost+'</td></tr>'
        });
    })
    .catch(error => {
        // 处理错误
        console.error('There was a problem with the fetch operation:', error);
    });