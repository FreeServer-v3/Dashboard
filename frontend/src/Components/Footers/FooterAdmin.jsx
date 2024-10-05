import React from 'react';

export default function FooterAdmin() {
	const [adEnabled, setAdEnabled] = React.useState(false);
	const [adJson, setAdJson] = React.useState();
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		fetch('https://cdn.freeserver.tw/ad/list.json')
		.then(response => response.text())
		.then(text => {
			try {
			const json = JSON.parse(text);
			if (Array.isArray(json)) {
				// If the JSON is directly an array of ads
				setAdEnabled(true);
				const randomAd = json[Math.floor(Math.random() * json.length)];
				setAdJson(randomAd);
			} else if (json.list && Array.isArray(json.list)) {
				// If the JSON has a 'list' property that is an array
				if (json.disabled) {
				setAdEnabled(false);
				} else {
				setAdEnabled(true);
				const randomAd = json.list[Math.floor(Math.random() * json.list.length)];
				setAdJson(randomAd);
				}
			} else {
				// If the JSON structure is unexpected
				console.error('Unexpected JSON structure:', json);
				setAdEnabled(false);
			}
			} catch (error) {
			console.error('Error parsing JSON:', error);
			setAdEnabled(false);
			}
		})
		.catch(error => {
			console.error('Error fetching ad data:', error);
			setAdEnabled(false);
		})
		.finally(() => {
			setIsLoading(false);
		});
	}, []);

	return (
		<>
		{adEnabled ? 
			<>
			{/* ads */}
				{isLoading
					?
					<tr>
						<th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
							<div id="loading-button">
								<svg role="status" className="w-4 mr-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
									<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
								</svg>
							</div>
						</th>
					</tr>
					:
					<div className="relative flex flex-col min-w-0 break-words bg-orange-100 w-full mb-6 shadow-lg rounded">
						<div className="rounded-t mb-0 px-4 py-3 border-0">
							<div className="flex flex-wrap items-center">
							<div className="relative w-full px-4 max-w-full flex-grow flex justify-between items-center">
							    <a href={adJson.url} className="flex items-center font-bold text-xl">
							        <img src={adJson.image} className="w-8 h-8 mr-2" />
							        {adJson.text}
							    </a>
							    <a className='flex text-zinc-500 text-xs' href='https://freeserver.tw/donate'>
							        由 {adJson.name} 提供的贊助商廣告
							    </a>
								</div>
            				</div>
            			</div>
					</div>
				}
			</>
			:
			null
		}
			<footer className="block py-4 bg-white text-zinc-800">
				<div className="container mx-auto px-4">
					<hr className="mb-4 border-b-1 border-blueGray-200" />
					<div className="flex flex-wrap items-center md:justify-between justify-center">
						<div className="w-full md:w-4/12 px-4">
							<div className="text-sm text-blueGray-500 font-semibold py-1 text-center md:text-left">
                Copyright © {new Date().getFullYear()}{' '}
								<a
									href="https://freeserver.tw"
									className="text-blueGray-500 hover:text-blueGray-700 text-orange-300 text-sm font-semibold py-1"
								>
                  Free
								</a>
								<a
									href="https://freeserver.tw"
									className="text-blueGray-500 hover:text-blueGray-700 text-zinc-300 text-sm font-semibold py-1"
								>
                  Server
								</a>
								<a href="https://freeserver.tw/credits" className='text-xs text-black'> (Credits)</a>
							</div>
						</div>
						<div className="w-full md:w-8/12 px-4">
							<ul className="flex flex-wrap list-none md:justify-end  justify-center">
								<li>
									<a
										href="https://freeserver.tw"
										className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
									>
                    官網
									</a>
								</li>
								<li>
									<a
										href="https://freeserver.tw/tos"
										className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
									>
                    服務條款
									</a>
								</li>
								<li>
									<a
										href="https://freeserver.tw/privacy"
										className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
									>
                    隱私政策
									</a>
								</li>
								<li>
									<a
										href="https://discord.gg/k5GgFFxN2Q"
										className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
									>
                    Discord
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</footer>
		</>
	);
}
