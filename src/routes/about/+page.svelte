<!-- 获取入参 -->
<script>
	const props = $props();
	let { name } = props;
	//  把 $props 所有属性输出到 console
	console.log(props);
</script>

<h1>About</h1>
<p>This is the about page.</p>
<a href="/">Go back to the home page</a>
