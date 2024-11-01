import React from 'react';

export const Panel = ({children, title}: {
    children: React.ReactNode
    title?: string
}) => (
    <div style={{
        backgroundColor: '#313031',
        padding: '8px',
        marginBottom: '12px',
        borderWidth: '4px',
        borderStyle: 'solid',
        borderColor: 'rgb(46, 38, 35)',
        borderImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAMAAAAMs7fIAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw1AUhU9bpSIVETuICAasulgQFXHUKhShQqgVWnUweekfNGlIUlwcBdeCgz+LVQcXZ10dXAVB8AfE0clJ0UVKvC8ptIjxwuN9nHfP4b37AH+txFSzbRxQNctIxmNCOrMqBF/hwyB6MIohiZn6nCgm4Flf99RNdRflWd59f1aXkjUZ4BOIZ5luWMQbxNObls55nzjMCpJCfE48ZtAFiR+5Lrv8xjnvsJ9nho1Ucp44TCzkW1huYVYwVOIp4oiiapTvT7uscN7irJYqrHFP/sJQVltZ5jqtAcSxiCWIECCjgiJKsBClXSPFRJLOYx7+fscvkksmVxGMHAsoQ4Xk+MH/4PdszdzkhJsUigHtL7b9MQwEd4F61ba/j227fgIEnoErrekv14CZT9KrTS1yBHRvAxfXTU3eAy53gL4nXTIkRwrQ8udywPsZfVMG6L0FOtfcuTXOcfoApGhWiRvg4BAYyVP2use7O1rn9m9PY34/opByuh0Yaa8AAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfmAgIQJSQU1l6SAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAALpQTFRFZGJhY2BgYF1cXVpZXFpZXFpYW1hXWlVSV1JQT01MT0xLT0pJTUdETUZDSEJBPDk4PDg3PzYzPzYxOzc2OzYzNi8sMTAxMTAwMS8wMS8vMS4vMC4uMC0tMCwsMCwrMCsqLyooMSYhLCclLCYlLiUhLCUkKCEfJSIhJyEeJSEhJyAdJCEfJCAeJx0aIx0bIxwZIxsYIxoXIBoXHhYUFQ8NEw4NDw4NEQ0MEA0MDw0NDAkHBQQDAwICAAAAeCdZ2wAAAAFiS0dECfHZpewAAACCSURBVHhebY9LDsMwCAXh+RdUiCPl/lc1EXa8aNWRjR6zAWANTBtGM5RSS8kpyDOjR62LMB16N5HXiLRbkeulaqarXDXDx/CxiQY03H25GQhORL6JDPrlj4mFeTPXJkREMAOBgdVPN98hqvp5vxwAJ9HTemCnSmLEgbktcpwMfM8HHrGVLy5TM6g2AAAAAElFTkSuQmCC) 8/4px repeat',
        boxShadow: '0px 0px 3px 0px #201815',
        overflow: 'hidden'
    }}>
        {title && (
            <div style={{
                color: '#ffe6c0',
                fontSize: '116%',
                fontWeight: 'bold',
                marginBottom: '12px'
            }}>
                {title}
            </div>
        )}
        {children}
    </div>
);
