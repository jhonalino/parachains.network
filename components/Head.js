import NextHead from 'next/head';

export default function Head(props) {

    const { title } = props;

    return (
        <NextHead>
            <title>{title}</title>
            <link rel="icon" href="/favicon.ico" />
            <meta property="og:type" content="website" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta property="og:url" content="https://stakingrewards.network/" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={title} />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Work+Sans:wght@300;400;700&display=swap" rel="stylesheet" />
        </NextHead>
    );

}