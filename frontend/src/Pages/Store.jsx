import React from 'react';

import CardStoreRescalc from '../Components/Cards/CardStoreRescalc';
import CardStore from '../Components/Cards/CardStore';

export default function Store() {
	return (
		<>
			{/* <div className="flex flex-wrap mt-4">
				<CardStoreRescalc />
			</div> */}
			<div className="flex flex-wrap mt-4">
				<CardStore />
			</div>
		</>
	);
}
