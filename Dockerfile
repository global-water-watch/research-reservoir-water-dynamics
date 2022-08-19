FROM jupyter/minimal-notebook:lab-3.2.5

USER root

# Apt steps
RUN apt-get update -y && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
 && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
 && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | tee /usr/share/keyrings/cloud.google.gpg \
 && apt-get update -y \
 && apt-get install google-cloud-sdk -y \
 && rm -rf /var/lib/apt/lists/*

COPY ./environment.yaml ${HOME}/environment.yaml

# run mambda python env update
RUN mamba env update --name base --file environment.yaml --prune \
 && rm environment.yaml

RUN jupyter labextension install jupyter-matplotlib

# edit config
RUN echo "c.NotebookApp.iopub_data_rate_limit = 10000000" >> /home/jovyan/.jupyter/jupyter_notebook_config.py \
 && echo "c.NotebookApp.iopub_msg_rate_limit = 100000" >> /home/jovyan/.jupyter/jupyter_notebook_config.py

RUN chmod 777 /home/jovyan/.config

USER ${NB_UID}

CMD ["jupyter", "lab", "--port=8888", "--no-browser", "--ip=0.0.0.0"]
