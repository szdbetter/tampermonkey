// 修复数据库脚本 - 解决"object store not found"错误
// 在控制台中运行此脚本以重置IndexedDB数据库
(function() {
    console.log("开始修复数据库...");
    const deleteRequest = indexedDB.deleteDatabase("MultiChainArbitrageDB");
    deleteRequest.onsuccess = () => {
        console.log("旧数据库已成功删除");
        console.log("请刷新页面以重新创建数据库和初始化数据");
        if (confirm("数据库已重置。点击确定刷新页面以重新初始化数据库。")) {
            window.location.reload();
        }
    };
    deleteRequest.onerror = (event) => {
        console.error("删除数据库时出错:", event);
        alert("删除数据库时出错。请尝试清除浏览器缓存后重试。");
    };
})();
