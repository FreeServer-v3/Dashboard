import React from 'react';
import discordImg from '../Assets/Img/discord.svg';

export default function Login() {

	const redirectDiscord = () => {
		window.location.href = '/auth/discord'
	}

	const redirectDocs = () => {
		window.location.href = 'https://docs.freeserver.tw'
	}

	return (
		<>
			<div className="container mx-auto px-4 h-full">
				<div className="flex content-center items-center justify-center h-full">
					<div className="w-full lg:w-6/12 px-4">
						<div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
							<div className="rounded-t mb-0 px-6 py-6">
								<div className="text-center mb-3">
									<br></br>
									<h1 className='text-xl'>FreeServer | 管理面板</h1>
									<br></br>
									<h6 className="text-blueGray-500 text-sm font-bold">
										您即將登入管理面板:
									</h6>
								</div>
								<div className="btn-wrapper text-center">
									<button onClick={redirectDiscord} className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none mr-2 mb-1 uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150" type="button">
										<img alt="..." className="w-5 mr-1" src={discordImg} />
										使用 Discord 登入
									</button>
								</div>
							</div>
						</div>
						<div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
							<div className="rounded-t mb-0 px-6 py-6">
								<div className="text-center mb-3">
									<br></br>
									<h1 className='text-xl'>嘿!不會使用嗎?</h1>
									<br></br>
									<h6 className="text-blueGray-500 text-sm font-bold">
										可以看看我們的文檔!
									</h6>
								</div>
								<div className="btn-wrapper text-center">
									<button onClick={redirectDocs} className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none mr-2 mb-1 uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150" type="button">
										前往文檔
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
