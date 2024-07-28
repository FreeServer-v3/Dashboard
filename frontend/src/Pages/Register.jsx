import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import discordImg from '../Assets/Img/discord.svg';
import Alert from '../Components/Alert';
import register from '../Api/Register';

export default function Register() {
	const [message, setMessage] = useState('');
	const navigate = useNavigate();

	const formregister = (event) => {
		register(event).then(data => {
			if (data.success) return navigate('/dashboard');
			if (data.error) setMessage(data.error);
		});
	};

	const redirectDiscord = () => {
		window.location.href = '/auth/discord'
	}

	return ("hmm");
}
